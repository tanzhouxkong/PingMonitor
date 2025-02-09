class PingMonitor {
  constructor() {
    this.version = "1.0.0"; // 当前版本
    this.githubRepo = "https://api.github.com/repos/tanzhouxkong/PingMonitor/releases/latest"; // GitHub API
    this.sites = this.loadSitesFromStorage();
    this.chartInstance = null;
    this.chartType = "line";
    this.testingActive = true;
    this.init();
  }

  // 初始化应用
  init() {
    this.setupEventListeners();
    this.renderSiteList();
    this.setupChart();
    this.startTestingLoop();
    this.checkForUpdates();
  }

  // 事件监听设置
  setupEventListeners() {
    document.getElementById("addSiteBtn").addEventListener("click", () => this.handleAddSite());
    document.getElementById("exportBtn").addEventListener("click", () => this.exportConfig());
    document.getElementById("importFile").addEventListener("change", (e) => this.handleFileImport(e));
    document.getElementById("toggleChartBtn").addEventListener("click", () => this.toggleChartType());
    document.getElementById("toggleDetailsBtn").addEventListener("click", () => this.toggleDetails());
    document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importFile").click());
  }

  // 数据加载/保存
  loadSitesFromStorage() {
    try {
      return JSON.parse(localStorage.getItem("ping-sites")) || [];
    } catch (error) {
      console.error("无法读取本地存储:", error);
      return [];
    }
  }

  saveToStorage() {
    try {
      const saveData = this.sites.map((site) => ({
        name: site.name,
        url: site.url,
        history: site.history.slice(-20),
        status: site.status,
      }));
      localStorage.setItem("ping-sites", JSON.stringify(saveData));
    } catch (error) {
      console.error("保存数据失败:", error);
    }
  }

  // 添加站点
  async handleAddSite() {
    const nameInput = document.getElementById("siteName");
    const urlInput = document.getElementById("siteUrl");

    try {
      this.validateInput(nameInput.value.trim(), urlInput.value.trim());
      this.addSite({
        name: nameInput.value.trim(),
        url: this.normalizeUrl(urlInput.value.trim()),
      });
      nameInput.value = "";
      urlInput.value = "";
    } catch (error) {
      alert(error.message);
      error.target.focus();
    }
  }

  validateInput(name, url) {
    if (!name) throw new Error("请输入站点名称", { target: document.getElementById("siteName") });
    try {
      new URL(this.normalizeUrl(url));
    } catch {
      throw new Error("请输入有效的URL地址", { target: document.getElementById("siteUrl") });
    }
  }

  normalizeUrl(url) {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `https://${url}`;
  }

  addSite(site) {
    this.sites.push({
      ...site,
      history: [],
      status: "unknown",
      lastUpdated: null,
    });
    this.saveToStorage();
    this.renderSiteList();
  }

  // 渲染站点列表
  renderSiteList() {
    const container = document.getElementById("siteList");
    container.innerHTML = this.sites
      .map((site, index) => this.createSiteElement(site, index))
      .join("");
  }

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
      this.sites.splice(index, 1);
      this.saveToStorage();
      this.renderSiteList();
    }
  }

  // 编辑站点
  editSite(index) {
    const site = this.sites[index];
    const newName = prompt("请输入新的站点名称", site.name);
    const newUrl = prompt("请输入新的站点 URL", site.url);

    if (newName && newUrl) {
      this.sites[index].name = newName;
      this.sites[index].url = this.normalizeUrl(newUrl);
      this.saveToStorage();
      this.renderSiteList();
    }
  }

  // 测试所有站点
  async testAllSites() {
    const results = await Promise.all(
      this.sites.map(async (site, index) => {
        const latency = await this.testSite(site);
        this.updateSiteStatus(index, latency);
      })
    );
    this.saveToStorage();
    this.renderSiteList();
  }

  // 测试单个站点
  async testSite(site) {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000); // 超时 3 秒

      await fetch(site.url, {
        mode: "no-cors",
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeout);
      return Math.round(performance.now() - start); // 返回延迟时间
    } catch (error) {
      return null; // 测试失败
    }
  }

  // 更新站点状态
  updateSiteStatus(index, latency) {
    const site = this.sites[index];
    site.status = latency !== null ? "online" : "offline";
    site.lastUpdated = new Date().toISOString();
    site.history.push({
      timestamp: new Date().toISOString(),
      latency,
    });
    if (site.history.length > 20) {
      site.history.shift();
    }
  }

  // 延迟函数
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 启动测试循环
  async startTestingLoop() {
    while (this.testingActive) {
      await this.testAllSites();
      this.updateStatistics();
      this.updateChart();
      await this.delay(15000); // 每 15 秒测试一次
    }
  }

  // 更新统计信息
  updateStatistics() {
    const validLatencies = this.sites
      .filter((site) => site.status === "online")
      .flatMap((site) => site.history)
      .filter((record) => record.latency !== null)
      .map((record) => record.latency);

    const onlineCount = this.sites.filter((site) => site.status === "online").length;
    const offlineCount = this.sites.filter((site) => site.status === "offline").length;
    const avgLatency = validLatencies.length > 0 ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length) : "-";

    document.getElementById("onlineCount").textContent = onlineCount;
    document.getElementById("offlineCount").textContent = offlineCount;
    document.getElementById("avgLatency").textContent = avgLatency === "-" ? avgLatency : `${avgLatency}ms`;
  }

  // 图表管理
  setupChart() {
    const ctx = document.getElementById("latencyChart").getContext("2d");
    this.chartInstance = new Chart(ctx, {
      type: this.chartType,
      data: {
        labels: Array.from({ length: 20 }, //(_, i) => i + 1
        ),
        datasets: [
          {
            label: "平均延迟",
            data: Array(20).fill(null),
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "延迟 (ms)" },
          },
          x: {
            title: { display: true, text: "时间 (最近测试)" },
          },
        },
      },
    });
  }

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
      return count > 0 ? Math.round(sum / count) : null;
    });

    this.chartInstance.data.labels = labels;
    this.chartInstance.data.datasets[0].data = averageData;
    this.chartInstance.update();
  }

  toggleChartType() {
    this.chartType = this.chartType === "line" ? "bar" : "line";
    this.chartInstance.destroy();
    this.setupChart();
    this.updateChart();
  }

  // 渲染延迟趋势表格
  renderLatencyTable() {
    const tableBody = document.getElementById("latencyTableBody");
    tableBody.innerHTML = this.sites
      .flatMap((site) =>
        site.history.map((record) => ({
          name: site.name,
          timestamp: record.timestamp,
          latency: record.latency,
        }))
      )
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // 按时间倒序
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
  }

  // 切换显示详细数据
  toggleDetails() {
    const tableBody = document.getElementById("latencyTableBody");
    const toggleBtn = document.getElementById("toggleDetailsBtn");

    if (toggleBtn.textContent === "显示更多") {
      tableBody.innerHTML = this.sites
        .flatMap((site) =>
          site.history.map((record) => ({
            name: site.name,
            timestamp: record.timestamp,
            latency: record.latency,
          }))
        )
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
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
      this.renderLatencyTable(); // 还原默认显示
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
      event.target.value = ""; // 清空文件输入
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

  // 从 URL 加载站点列表
  async loadSitesFromURL(url) {
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (Array.isArray(data)) {
        this.sites = data.map((site) => ({
          name: site.name || "未命名站点",
          url: this.normalizeUrl(site.url),
          history: [],
          status: "unknown",
        }));
        this.saveToStorage();
        this.renderSiteList();
        alert("站点列表加载成功！");
      } else {
        throw new Error("无效的站点列表格式");
      }
    } catch (error) {
      alert(`加载站点列表失败: ${error.message}`);
    }
  }
}

// 初始化应用
const pingMonitor = new PingMonitor();

