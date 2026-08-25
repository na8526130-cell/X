# デプロイガイド (Render & Vercel)

本プロジェクトは **Render (Web Service)** および **Vercel (Serverless)** の両方にワンクリックでデプロイできるよう構成されています。

---

## 1. Render へのデプロイ手順

RenderはNode.jsサーバーとして常時起動で動作します（WebSocketや動画プロキシダウンロードに最適です）。

### 手順
1. [Render Dashboard](https://dashboard.render.com/) にアクセスし、**New +** → **Web Service**（または Blueprint）を選択します。
2. GitHubなどのリポジトリを接続します。
3. 設定項目を確認・入力します：
   - **Name**: `x-realtime-viewer` (お好みの名前)
   - **Environment**: `Node`
   - **Region**: `Singapore` または `Tokyo` (利用可能なリージョン)
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Health Check Path**: `/api/health`
4. **Environment Variables (環境変数)**:
   - `NODE_ENV`: `production`
   - `GEMINI_API_KEY`: (AI要約機能を利用する場合は設定)
5. **Create Web Service** をクリックするとビルドとデプロイが自動で完了します。
   *(※リポジトリルートに `render.yaml` が含まれているため、Blueprint による一括セットアップも可能です)*

---

## 2. Vercel（バーゼル / ヴァーセル）へのデプロイ手順

Vercelはフロントエンドを高速なエッジCDNで配信し、バックエンドAPI（`/api/*`）をサーバーレス関数として自動実行します。

### 手順
1. [Vercel Dashboard](https://vercel.com/dashboard) にアクセスし、**Add New...** → **Project** を選択します。
2. GitHubなどのリポジトリをインポート（Import）します。
3. プロジェクト設定：
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (デフォルト)
   - **Build Command**: `vite build` (または `npm run build`)
   - **Output Directory**: `dist`
4. **Environment Variables**:
   - `GEMINI_API_KEY`: (AI要約機能を利用する場合は設定)
5. **Deploy** をクリックします。
   *(※リポジトリルートに `vercel.json` および `/api/index.ts` が用意されているため、APIルーティングとSPAフォールバックが自動で設定されます)*

---

## 動作確認用エンドポイント
- ヘルスチェック: `/api/health`
- トレンド取得: `/api/realtime/trends`
- リアルタイム検索: `/api/realtime/search?p=検索語`
- YouTube Education パラメータ: `/api/education-param`
