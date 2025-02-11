const { createApp, ref, computed, onMounted } = Vue;

createApp({
    setup() {
        // 数据
        const darkMode = ref(localStorage.getItem('darkMode') === 'true' || false);
        const sites = ref(JSON.parse(localStorage.getItem('ping-sites')) || []);
        const newSiteName = ref('');
        const newSiteUrl = ref('');
        const chartType = ref('line');
        let chartInstance = null;
        const isEditModalOpen = ref(false);
        const editingSiteIndex = ref(null);

        // 颜色列表（用于区分不同网站）
        const colorList = [
            '#3b82f6', // 蓝色
            '#ef4444', // 红色
            '#10b981', // 绿色
            '#f59e0b', // 橙色
            '#8b5cf6', // 紫色
            '#ec4899', // 粉色
            '#14b8a6', // 青色
            '#f97316', // 橙色
            '#6366f1', // 靛蓝
            '#d946ef'  // 紫红
        ];

        // 计算属性
        const onlineCount = computed(() => sites.value.filter(site => site.status === 'online').length);
        const offlineCount = computed(() => sites.value.filter(site => site.status === 'offline').length);
        const avgLatency = computed(() => {
            const latencies = sites.value
                .filter(site => site.status === 'online')
                .flatMap(site => site.history)
                .filter(record => record.latency !== null)
                .map(record => record.latency);
            return latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : '-';
        });
        const latencyRecords = computed(() => sites.value
            .flatMap(site => site.history.map(record => ({
                name: site.name,
                timestamp: record.timestamp,
                latency: record.latency,
                color: site.color // 添加颜色字段
            })))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        );

        // 深色模式切换
        const toggleDarkMode = () => {
            darkMode.value = !darkMode.value;
            localStorage.setItem('darkMode', darkMode.value);
            document.documentElement.classList.toggle('dark', darkMode.value);
        };

        // 自动补全 URL 协议
        const normalizeUrl = (url) => {
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                return `https://${url}`; // 默认补全 https://
            }
            return url;
        };

        // 添加站点
        const addSite = () => {
            if (!newSiteName.value.trim() || !newSiteUrl.value.trim()) return;

            const url = normalizeUrl(newSiteUrl.value.trim());
            const color = colorList[sites.value.length % colorList.length]; // 分配颜色

            const newSite = {
                name: newSiteName.value.trim(),
                url: url,
                status: 'unknown',
                history: [],
                color: color
            };
            sites.value.push(newSite);
            newSiteName.value = '';
            newSiteUrl.value = '';
            saveSites();
            testSite(newSite);
        };

        // 删除站点
        const deleteSite = (index) => {
            sites.value.splice(index, 1);
            saveSites();
        };

        // 打开编辑窗口
        const openEditModal = (index) => {
            editingSiteIndex.value = index;
            const site = sites.value[index];
            newSiteName.value = site.name;
            newSiteUrl.value = site.url;
            isEditModalOpen.value = true;
        };

        // 保存编辑
        const saveEdit = () => {
            const site = sites.value[editingSiteIndex.value];
            site.name = newSiteName.value.trim();
            site.url = normalizeUrl(newSiteUrl.value.trim());
            newSiteName.value = '';
            newSiteUrl.value = '';
            isEditModalOpen.value = false;
            saveSites();
            testSite(site); // 重新测试站点
        };

        // 测试单个站点
        const testSite = async (site) => {
            try {
                const startTime = Date.now();
                const response = await fetch(site.url, { method: 'HEAD', mode: 'no-cors', cache: 'no-cache' });
                const latency = Date.now() - startTime;
                site.status = 'online';
                site.history.push({ timestamp: new Date().toISOString(), latency });
            } catch {
                site.status = 'offline';
                site.history.push({ timestamp: new Date().toISOString(), latency: null });
            }
            saveSites();
            updateChart();
        };

        // 测试所有站点
        const testAllSites = async () => {
            for (const site of sites.value) {
                await testSite(site);
            }
        };

        // 初始化图表
        const setupChart = () => {
            const ctx = document.getElementById('latencyChart').getContext('2d');
            chartInstance = new Chart(ctx, {
                type: chartType.value,
                data: {
                    labels: Array.from({ length: 20 }, (_, i) => i + 1),
                    datasets: sites.value.map((site, index) => ({
                        label: site.name,
                        data: Array(20).fill(null),
                        borderColor: site.color, // 使用站点颜色
                        backgroundColor: `${site.color}20`, // 使用站点颜色
                        fill: false,
                        tension: 0.3
                    }))
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: '延迟 (ms)' } },
                        x: { title: { display: true, text: '时间 (最近测试)' } }
                    }
                }
            });
        };

        // 更新图表
        const updateChart = () => {
            const labels = Array.from({ length: 20 }, (_, i) => i + 1);
            chartInstance.data.datasets = sites.value.map(site => ({
                label: site.name,
                data: site.history.slice(-20).map(record => record.latency),
                borderColor: site.color, // 使用站点颜色
                backgroundColor: `${site.color}20`, // 使用站点颜色
                fill: false,
                tension: 0.3
            }));
            chartInstance.update();
        };

        // 切换图表类型
        const toggleChartType = () => {
            chartType.value = chartType.value === 'line' ? 'bar' : 'line';
            chartInstance.destroy();
            setupChart();
        };

        // 导出配置
        const exportConfig = () => {
            const data = JSON.stringify(sites.value, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'pingmonitor-config.json';
            a.click();
            URL.revokeObjectURL(url);
        };

        // 导入配置
        const handleFileImport = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    sites.value = data;
                    saveSites();
                    testAllSites();
                } catch (error) {
                    alert('导入失败：文件格式错误');
                }
            };
            reader.readAsText(file);
        };

        // 保存站点
        const saveSites = () => {
            localStorage.setItem('ping-sites', JSON.stringify(sites.value));
        };

        // 启动测试循环
        const startTestingLoop = () => {
            setInterval(testAllSites, 15000); // 每 15 秒测试一次
        };

        // 格式化时间
        const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString();

        // 初始化
        onMounted(() => {
            document.documentElement.classList.toggle('dark', darkMode.value);
            setupChart();
            startTestingLoop();
            if (sites.value.length > 0) testAllSites();
        });

        return {
            darkMode, sites, newSiteName, newSiteUrl, chartType, isEditModalOpen, editingSiteIndex,
            onlineCount, offlineCount, avgLatency, latencyRecords,
            toggleDarkMode, addSite, deleteSite, openEditModal, saveEdit, testAllSites,
            setupChart, updateChart, toggleChartType, exportConfig,
            handleFileImport, formatTime
        };
    }
}).mount('#app');
