


```markdown
# 🚀 PingMonitor 部署指南

## 🌩️ 云平台部署

### Vercel 部署
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=Vercel)](https://vercel.com/new)
```bash
1. 推送代码到 GitHub/GitLab 仓库
2. 在 Vercel 仪表盘导入项目
3. 配置构建命令：npm run build
4. 点击 Deploy 完成部署
```

### Zeabur 部署
[![Zeabur](https://img.shields.io/badge/Deploy-Zeabur-1890FF?style=for-the-badge)](https://zeabur.com)
```bash
1. 推送代码到 GitHub/GitLab 仓库
2. 在 Zeabur 控制台创建新项目
3. 配置启动命令：npm run start
4. 部署完成后自动分配访问域名
```

### GitPod 部署
[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/)
```bash
1. 推送代码到 GitHub/GitLab 仓库
2. 通过 GitPod 界面打开项目
3. 自动安装依赖并启动服务 (npm run dev)
4. 访问生成的分发域名使用服务
```

---

## ✨ 项目功能概览

### 📈 核心监控
🟢 实时网络延迟检测
🟡 站点增删改管理
🔴 异常状态即时提示
📊 响应时间历史记录

### 📊 数据统计
✅ 在线/离线站点计数
⏱️ 平均延迟计算
📉 延迟趋势图表
📜 原始数据表格展示

### ⚙️ 高级功能
📥 配置导入/导出 (JSON 格式)
🔄 后台自动更新检查
🌐 多平台云端部署支持
📱 响应式移动端适配

---

## 📦 技术支持栈
| 技术领域        | 使用组件                  |
|----------------|--------------------------|
| 前端框架        | ![HTML5](https://img.shields.io/badge/-HTML5-E34F26?logo=html5&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/-Tailwind%20CSS-38B2AC?logo=tailwind-css&logoColor=white) |
| 可视化图表      | ![Chart.js](https://img.shields.io/badge/-Chart.js-FF6384?logo=chart.js&logoColor=white) |
| 部署平台        | ![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white) ![Zeabur](https://img.shields.io/badge/Zeabur-1890FF?logo=zeabur&logoColor=white) |

---

## 🛠️ 开发支持
```bash
# 安装依赖
npm install

# 开发模式 (热重载)
npm run dev

# 生产构建
npm run build

# 本地测试
npm run preview
```

---

> 💡 提示：所有平台部署均自动配置域名 HTTPS 证书
> 🔧 建议生产环境设置环境变量 `NODE_ENV=production`
```

### 优化亮点：
1. 使用徽章图标 (Badges) 标识部署平台
2. 采用语法高亮的代码块展示命令
3. 功能分类使用 icon + 颜色标识状态
4. 添加技术支持栈表格
5. 增加开发命令代码块
6. 使用醒目的分隔线区分章节
7. 引入 emoji 提升可读性
8. 添加提示块强调关键信息
