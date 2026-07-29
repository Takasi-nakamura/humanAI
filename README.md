# 🤖 HumanAI - 完全初心者向け構築＆デプロイガイド

「人間関係を上手に構築する」人間味あふれるAIパートナーアプリです。
PWA対応でスマホ・タブレット・PCの全端末に対応し、完全に**無料**で構築・運用できます。

---

## 📖 目次
1. [特徴](#特徴)
2. [事前準備（必要なアカウント）](#事前準備)
3. [Gemini APIキーの取得方法](#gemini-apiキーの取得方法)
4. [Firebaseの作成＆連携手順](#firebaseの作成連携手順)
5. [ローカル環境での動かし方](#ローカル環境での動かし方)
6. [GitHubへの公開＆VercelでのPWA化](#githubへの公開vercelでのpwa化)
7. [スマホでのPWA保存手順](#スマホでのpwa保存手順)

---

## ✨ 特徴
- **HumanAI Engine**: 回答前に会話目的・感情・距離感を推測し、親しみやすいトーンで応答。
- **モデル切替**: Gemini 3.6 Flash / Gemini 3.5 Flash Lite を画面上で即座に変更。
- **モダンUI**: 白基調のシンプルデザイン、ダークモード、Markdown & LaTeX(数式)完全対応。
- **ファイル添付**: 画像、テキスト、マークダウンファイルをドラッグ＆ドロップ添付。
- **自律通知システム**: AIが会話文脈を考慮し、自然なタイミングでプッシュ通知を発火。

---

## 🛠 事前準備
すべて無料で作成できます。
1. **GitHub アカウント** (https://github.com/)
2. **Google アカウント**
3. **Vercel アカウント** (https://vercel.com/)

---

## 🔑 Gemini APIキーの取得方法
1. [Google AI Studio](https://aistudio.google.com/) にアクセスしてログインします。
2. **「Get API key」** ボタンをクリックします。
3. **「Create API key」** を押して生成されたキー（`AIzaSy...`）をコピーしておきます。

---

## 🔥 Firebaseの作成＆連携手順
1. [Firebase Console](https://console.firebase.google.com/) にアクセスし、**「プロジェクトを追加」** をクリック。
2. プロジェクト名に `human-ai` と入力し、手順に従って作成（Googleアナリティクスは任意）。
3. プロジェクト概要ページで **Webアイコン（`</>`）** をクリックしてアプリを登録。
4. 表示された `firebaseConfig` の各値をコピーし、`.env` ファイルに記述します。

---

## 🚀 ローカル環境での動かし方

### 1. 依存パッケージのインストール
```bash
npm install
```

### 2. 環境変数の作成
プロジェクト直下に `.env` ファイルを作成し、以下を貼り付けます：
```env
VITE_FIREBASE_API_KEY=あなたのAPIキー
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-app-id
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### 3. 開発サーバー起動
```bash
npm run dev
```
ブラウザで `http://localhost:5173` を開いて動作を確認します。

---

## 🌐 GitHubへの公開＆VercelでのPWA化

### GitHubへアップロード
```bash
git init
git add .
git commit -m "Initial commit of HumanAI"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/human-ai.git
git push -u origin main
```

### Vercelで一発デプロイ
1. Vercelダッシュボードから **「Add New Project」** を選択。
2. GitHubの `human-ai` リポジトリをインポート。
3. **「Environment Variables」** に `.env` に設定したFirebase情報を追加。
4. **「Deploy」** をクリック！数秒でURL（`https://human-ai.vercel.app`）が発行されます。

---

## 📱 スマホでのPWA保存手順
1. スマホのSafariまたはChromeでデプロイされたURLにアクセス。
2. **iOS (Safari)**: 画面下部の共有ボタン ➔ **「ホーム画面に追加」**
3. **Android (Chrome)**: 画面右上のメニュー ➔ **「ホーム画面に追加」** または **「アプリをインストール」**

これでスマホのアプリ一覧からNativeアプリ感覚で直接起動可能になります！