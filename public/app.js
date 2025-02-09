class PingMonitor {
    constructor() {
      this.version = "1.0.0"; // 当前版本号
      this.githubRepo = "https://api.github.com/repos/yourusername/yourrepo/releases/latest"; // GitHub API 地址
      this.sites = this.loadSitesFromStorage(); // 从本地存储加载站点
      this.chartInstance = null; // Chart.js 图表实例
      this.chartType = "line"; // 默认图表类型
      this.testingActive = true; // 是否启用测试循环
      this.init(); // 初始化应用
    }
  
    // 初始化应用
    init() {
      this.setupEventListeners(); // 设置事件监听器
      this.renderSiteList(); // 渲染站点列表
      this.setupChart(); // 初始化图表
      this.startTestingLoop(); // 启动测试循环
      this.checkForUpdates(); // 检查更新
    }
  
    // 设置事件监听器
    setupEventListeners() {
      document.getElementById("addSiteBtn").addEventListener("click", () => this.handleAddSite()); // 添加站点
      document.getElementById("exportBtn").addEventListener("click", () => this.exportConfig()); // 导出配置
      document.getElementById("importFile").addEventListener("change", (e) => this.handleFileImport(e)); // 导入配置
      document.getElementById("toggleChartBtn").addEventListener("click", () => this.toggleChartType()); // 切换图表类型
      document.getElementById("toggleDetailsBtn").addEventListener("click", () => this.toggleDetails()); // 切换表格显示详情
      document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importFile").click()); // 触发文件选择
    }
  
    // 从本地存储加载站点
    loadSitesFromStorage() {
      try {
        return JSON.parse(localStorage.getItem("ping-sites")) || []; // 读取本地存储，若无数据则返回空数组
      } catch (error) {
        console.error("无法读取本地存储:", error);
        return [];
      }
    }
  
    // 保存站点到本地存储
    saveToStorage() {
      try {
        const saveData = this.sites.map((site) => ({
          name: site.name,
          url: site.url,
          history: site.history.slice(-20), // 仅保留最近 20 条记录
          status: site.status,
        }));
        localStorage.setItem("ping-sites", JSON.stringify(saveData)); // 存储到本地
      } catch (error) {
        console.error("保存数据失败:", error);
      }
    }
  
    // 处理添加站点
    async handleAddSite() {
      const nameInput = document.getElementById("siteName");
      const urlInput = document.getElementById("siteUrl");
  
      try {
        this.validateInput(nameInput.value.trim(), urlInput.value.trim()); // 验证输入
        this.addSite({
          name: nameInput.value.trim(),
          url: this.normalizeUrl(urlInput.value.trim()), // 规范化 URL
        });
        nameInput.value = ""; // 清空输入框
        urlInput.value = "";
      } catch (error) {
        alert(error.message); // 显示错误信息
        error.target.focus(); // 聚焦到错误输入框
      }
    }
  
    // 验证输入
    validateInput(name, url) {
      if (!name) throw new Error("请输入站点名称", { target: document.getElementById("siteName") });
      try {
        new URL(this.normalizeUrl(url)); // 验证 URL 格式
      } catch {
        throw new Error("请输入有效的URL地址", { target: document.getElementById("siteUrl") });
      }
    }
  
    // 规范化 URL
    normalizeUrl(url) {
      if (!url) return "";
      if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
      }
      return `https://${url}`; // 默认补全协议
    }
  
    // 添加站点
    addSite(site) {
      this.sites.push({
        ...site,
        history: [], // 延迟历史记录
        status: "unknown", // 初始状态为未知
        lastUpdated: null, // 最后更新时间
      });
      this.saveToStorage(); // 保存数据
      this.renderSiteList(); // 重新渲染站点列表
    }
  
    // 渲染站点列表
    renderSiteList() {
      const container = document.getElementById("siteList");
      container.innerHTML = this.sites
        .map((site, index) => this.createSiteElement(site, index)) // 生成每个站点的 HTML
        .join("");
    }
  
    // 创建站点 HTML 元素
    createSiteElement(site, index) {
      const lastResult = site.history[site.history.length - 1];
      const latencyDisplay = site.status === "online" ? `${lastResult?.latency ?? "-"}ms` : '<span class="text-red-600">离线</span>';
  
      return `
        <div class="flex items-center justify-between p-3 border rounded hover:bg-gray-50 transition-colors">
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate">${site.name}</div>
            <div class="text-sm text-gray-500 truncate">${site.url}</div>
          </div>
          <div class="flex items-center gap-4 ml-4">
            <div class="w-20 text-right">${latencyDisplay}</div>
            <button onclick="pingMonitor.editSite(${index})" class="text-gray-400 hover:text-blue-500 transition-colors" title="编辑">✎</button>
            <button onclick="pingMonitor.deleteSite(${index})" class="text-gray-400 hover:text-red-500 transition-colors" title="删除">×</button>
          </div>
        </div>
      `;
    }
  
    // 删除站点
    deleteSite(index) {
      if (confirm("确定要删除此监控项吗？")) {
        this.sites.splice(index, 1); // 删除站点
        this.saveToStorage(); // 保存数据
        this.renderSiteList(); // 重新渲染站点列表
      }
    }
  
    // 编辑站点
    editSite(index) {
      const site = this.sites[index];
      const newName = prompt("请输入新的站点名称", site.name); // 获取新名称
      const newUrl = prompt("请输入新的站点 URL", site.url); // 获取新 URL
  
      if (newName && newUrl) {
        this.sites[index].name = newName; // 更新名称
        this.sites[index].url = this.normalizeUrl(newUrl); // 更新 URL
        this.saveToStorage(); // 保存数据
        this.renderSiteList(); // 重新渲染站点列表
      }
    }
  
    // 测试所有站点
    async testAllSites() {
      const results = await Promise.all(
        this.sites.map(async (site, index) => {
          const latency = await this.testSite(site); // 测试站点
          this.updateSiteStatus(index, latency); // 更新站点状态
        })
      );
      this.saveToStorage(); // 保存数据
      this.renderSiteList(); // 重新渲染站点列表
    }
  
    // 测试单个站点
    async testSite(site) {
      const start = performance.now(); // 记录开始时间
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000); // 3 秒超时
  
        await fetch(site.url, {
          mode: "no-cors",
          signal: controller.signal, // 启用中止控制器
          cache: "no-store", // 禁用缓存
        });
  
        clearTimeout(timeout); // 清除超时
        return Math.round(performance.now() - start); // 返回延迟时间
      } catch (error) {
        return null; // 测试失败
      }
    }
  
    // 更新站点状态
    updateSiteStatus(index, latency) {
      const site = this.sites[index];
      site.status = latency !== null ? "online" : "offline"; // 更新状态
      site.lastUpdated = new Date().toISOString(); // 更新最后测试时间
      site.history.push({
        timestamp: new Date().toISOString(), // 记录时间
        latency, // 记录延迟
      });
      if (site.history.length > 20) {
        site.history.shift(); // 移除最早记录
      }
    }
  
    // 延迟函数
    delay(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
  
    // 启动测试循环
    async startTestingLoop() {
      while (this.testingActive) {
        await this.testAllSites(); // 测试所有站点
        this.updateStatistics(); // 更新统计信息
        this.updateChart(); // 更新图表
        await this.delay(10000); // 等待 15 秒
      }
    }
  
    // 更新统计信息
    updateStatistics() {
      const validLatencies = this.sites
        .filter((site) => site.status === "online")
        .flatMap((site) => site.history)
        .filter((record) => record.latency !== null)
        .map((record) => record.latency);
  
      const onlineCount = this.sites.filter((site) => site.status === "online").length; // 在线站点数
      const offlineCount = this.sites.filter((site) => site.status === "offline").length; // 离线站点数
      const avgLatency = validLatencies.length > 0 ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length) : "-"; // 平均延迟
  
      document.getElementById("onlineCount").textContent = onlineCount;
      document.getElementById("offlineCount").textContent = offlineCount;
      document.getElementById("avgLatency").textContent = avgLatency === "-" ? avgLatency : `${avgLatency}ms`;
    }
  
    // 初始化图表
    setupChart() {
      const ctx = document.getElementById("latencyChart").getContext("2d");
      this.chartInstance = new Chart(ctx, {
        type: this.chartType, // 图表类型
        data: {
          labels: Array.from({ length: 20 }, (_, i) => i + 1), // X 轴标签
          datasets: [
            {
              label: "平均延迟",
              data: Array(20).fill(null), // Y 轴数据
              borderColor: "#3b82f6", // 线条颜色
              backgroundColor: "rgba(59, 130, 246, 0.1)", // 填充颜色
              fill: true,
              tension: 0.3, // 曲线平滑度
            },
          ],
        },
        options: {
          responsive: true, // 响应式
          maintainAspectRatio: false, // 不保持宽高比
          scales: {
            y: {
              beginAtZero: true, // Y 轴从 0 开始
              title: { display: true, text: "延迟 (ms)" }, // Y 轴标题
            },
            x: {
              title: { display: true, text: "时间 (最近测试)" }, // X 轴标题
            },
          },
        },
      });
    }
  
    // 更新图表
    updateChart() {
      const labels = Array.from({ length: 20 }, (_, i) => i + 1);
      const averageData = labels.map((_, index) => {
        const sum = this.sites
          .flatMap((site) => site.history.slice(-20)[index]?.latency)
          .filter((latency) => typeof latency === "number")
          .reduce((a, b) => a + b, 0);
        const count = this.sites
          .flatMap((site) => site.history.slice(-20)[index]?.latency)
          .filter((latency) => typeof latency === "number").length;
        return count > 0 ? Math.round(sum / count) : null; // 计算平均延迟
      });
  
      this.chartInstance.data.labels = labels; // 更新标签
      this.chartInstance.data.datasets[0].data = averageData; // 更新数据
      this.chartInstance.update(); // 重新渲染图表
    }
  
    // 切换图表类型
    toggleChartType() {
      this.chartType = this.chartType === "line" ? "bar" : "line"; // 切换类型
      this.chartInstance.destroy(); // 销毁当前图表
      this.setupChart(); // 初始化新图表
      this.updateChart(); // 更新图表数据
    }
  
    // 渲染延迟趋势表格
    renderLatencyTable() {
      const tableBody = document.getElementById("latencyTableBody");
      const records = this.sites
        .flatMap((site) =>
          site.history.map((record) => ({
            name: site.name,
            timestamp: record.timestamp,
            latency: record.latency,
          }))
        )
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // 按时间排序
  
      tableBody.innerHTML = records
        .slice(0, 10) // 默认显示最近的 10 条记录
        .map(
          (record) => `
          <tr>
            <td class="p-2">${new Date(record.timestamp).toLocaleTimeString()}</td>
            <td class="p-2">${record.name}</td>
            <td class="p-2">${record.latency || "离线"}</td>
          </tr>
        `
        )
        .join("");
  
      const toggleBtn = document.getElementById("toggleDetailsBtn");
      toggleBtn.textContent = records.length > 10 ? "显示更多" : "已全部显示";
    }
    //导入功能
    setupEventListeners() {
        document.getElementById("importBtn").addEventListener("click", () => {
          document.getElementById("importFile").click() // 触发文件选择
        })
      }
  
    // 切换表格显示详情
    toggleDetails() {
      const tableBody = document.getElementById("latencyTableBody");
      const toggleBtn = document.getElementById("toggleDetailsBtn");
  
      if (toggleBtn.textContent === "显示更多") {
        const records = this.sites
          .flatMap((site) =>
            site.history.map((record) => ({
              name: site.name,
              timestamp: record.timestamp,
              latency: record.latency,
            }))
          )
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
        tableBody.innerHTML = records
          .map(
            (record) => `
            <tr>
              <td class="p-2">${new Date(record.timestamp).toLocaleTimeString()}</td>
              <td class="p-2">${record.name}</td>
              <td class="p-2">${record.latency || "离线"}</td>
            </tr>
          `
          )
          .join("");
        toggleBtn.textContent = "收起";
      } else {
        this.renderLatencyTable();
        toggleBtn.textContent = "显示更多";
      }
    }
  
    // 导出配置
    exportConfig() {
      const dataStr = JSON.stringify({
        version: 1,
        timestamp: new Date().toISOString(),
        sites: this.sites,
      });
  
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
  
      const a = document.createElement("a");
      a.href = url;
      a.download = `ping-config_${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  
    // 导入配置
    async handleFileImport(event) {
      const file = event.target.files[0];
      if (!file) return;
  
      try {
        const content = await file.text();
        const config = JSON.parse(content);
  
        if (!config || !Array.isArray(config.sites)) {
          throw new Error("配置文件格式错误");
        }
  
        const validatedSites = config.sites.filter((site) => this.validateSite(site));
        this.sites = validatedSites;
        this.saveToStorage();
        this.renderSiteList();
        alert("导入成功！");
      } catch (error) {
        alert(`导入失败: ${error.message}`);
      } finally {
        event.target.value = "";
      }
    }
  
    // 验证站点格式
    validateSite(site) {
      return (
        typeof site.name === "string" &&
        typeof site.url === "string" &&
        site.name.trim() !== "" &&
        site.url.trim() !== ""
      );
    }
  
    // 检查更新
    async checkForUpdates() {
      try {
        const response = await fetch(this.githubRepo);
        const data = await response.json();
        const latestVersion = data.tag_name.replace("v", "");
  
        if (latestVersion > this.version) {
          const shouldUpdate = confirm(`发现新版本 ${latestVersion}，是否更新？`);
          if (shouldUpdate) {
            window.location.href = data.html_url; // 跳转到 GitHub 发布页面
          }
        }
      } catch (error) {
        console.error("检查更新失败:", error);
      }
    }
  }
  
  // 初始化应用
  const pingMonitor = new PingMonitor();
  