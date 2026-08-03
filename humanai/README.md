# HumanAI

**「人間っぽいAI」— 人間関係を上手に扱えることに特化したAIチャットアシスタント**

白基調・モダンなUIで、Gemini APIをベースに動作するチャットアプリです。
会話の目的・感情・距離感を内部で推測してから応答を組み立てる「HumanAI Engine」を搭載し、
必要なときだけそっと声をかけてくれる「自律通知システム」も備えています。

このREADMEは、**プログラミング初心者の方でも上から順番に進めれば公開・スマホ利用まで完了できる**ように、
省略なくすべての手順を書いています。少し長いですが、慌てず一つずつ進めてください。

---

## 目次

1. [できること（機能一覧）](#1-できること機能一覧)
2. [事前に必要なもの](#2-事前に必要なもの)
3. [手順の全体像](#3-手順の全体像)
4. [STEP1: Node.jsのインストール](#step1-nodejsのインストール)
5. [STEP2: プロジェクトファイルの準備](#step2-プロジェクトファイルの準備)
6. [STEP3: Gemini APIキーの取得](#step3-gemini-apiキーの取得)
7. [STEP4: Firebaseプロジェクトの作成](#step4-firebaseプロジェクトの作成)
8. [STEP5: Firebase認証の設定](#step5-firebase認証の設定)
9. [STEP6: Firestoreの設定](#step6-firestoreの設定)
10. [STEP7: 環境変数(.env)の設定](#step7-環境変数envの設定)
11. [STEP8: ローカルで動作確認](#step8-ローカルで動作確認)
12. [STEP9: 自律通知システムのセットアップ（無料・GitHub Actions方式）](#step9-自律通知システムのセットアップ無料github-actions方式)
13. [STEP10: GitHubへの公開](#step10-githubへの公開)
14. [STEP11: GitHub Pagesへのデプロイ（PWA化）](#step11-github-pagesへのデプロイpwa化)
15. [STEP12: スマホ・タブレットにインストール](#step12-スマホタブレットにインストール)
16. [困ったときは（トラブルシューティング）](#困ったときはトラブルシューティング)
17. [フォルダ構成](#フォルダ構成)
18. [技術スタック](#技術スタック)
19. [セキュリティに関する注意](#セキュリティに関する注意)

---

## 1. できること（機能一覧）

### チャット
- チャット送受信 / チャット履歴保存 / Markdown対応 / コードブロック表示（シンタックスハイライト付き）
- メッセージのコピー機能 / 数式(LaTeX)表示

### AI
- Gemini API対応（Gemini 3.6 Flash / Gemini 3.5 Flash Lite）
- チャット画面からその場でモデル変更可能
- システムプロンプト編集 / Temperature変更 / Max Output Tokens変更

### HumanAI Engine（独自機能）
回答生成前に、ユーザーには見せない内部処理を行います。
- 会話目的推測 / 感情推測 / 距離感推測 / 回答スタイル決定

### Memory
- チャット履歴保存 / 会話要約（自動） / ユーザー情報の長期記憶 / セッション管理

### UI
- 白基調・モダンデザイン / レスポンシブ対応（スマホ・タブレット・PC） / ダークモード / PWA対応

### ファイル
- 画像・PDF・テキストファイルの添付 / ドラッグ&ドロップ対応

### 設定
- APIキー設定（暗号化保存） / モデル設定 / メモリON・OFF / チャット削除 / データのエクスポート・インポート

### セキュリティ
- APIキー暗号化保存 / ローカル保存対応 / 入力バリデーション

### 自律通知システム（独自機能）
AIが会話履歴や記憶をもとに、通知すべきかどうかを自律的に判断します。
- 会話の続きに関する通知 / 約束・予定のリマインド / 状況に応じた自然な声掛け
- 毎日決まった時間の通知はしません。必要と判断した場合のみ通知します。依存を促す通知は行いません。
- Firebase無料プラン＋GitHub Actions無料枠のみで動作（クレジットカード登録不要）

### 会話検索・整理（独自機能）
- チャット内検索（全会話のタイトル・本文を横断検索）
- 会話のピン留め（よく使う会話をサイドバー上部に固定）
- 会話の複製 / 個別の会話を共有・ダウンロード
- 未読バッジ表示（他端末での更新を見た目で把握）

### アクセシビリティ・カスタマイズ
- AI応答の音声読み上げ（Web Speech API）
- 文字サイズ調整（小・中・大）
- クイック返信サジェスト（AIの返答に応じた短い返信候補をワンタップで送信）

---

## 2. 事前に必要なもの

- インターネットに繋がったパソコン（Windows / Mac どちらでも可）
- Googleアカウント（Firebase・Gemini APIの利用に必要）
- GitHubアカウント（無料で作成できます: https://github.com/signup ）
- ある程度の作業時間（初回は1〜2時間ほど見ておくと安心です）

**費用について**: 本アプリは**すべての機能を無料の範囲内**で動かせます。
「自律通知システム」もFirebaseの無料プラン(Sparkプラン)とGitHub Actionsの無料枠だけで完結する構成になっています。

---

## 3. 手順の全体像

```
① Node.jsをインストール
② このプロジェクトのファイルをパソコンに用意する
③ Gemini APIキーを取得する
④ Firebaseプロジェクトを作る（ログイン・データ保存のため）
⑤ Firebaseで認証機能をONにする
⑥ Firestore（データベース）を作る
⑦ 取得した情報を.envファイルに書き込む
⑧ パソコン上で動作確認する
⑨ （任意）自律通知システムをセットアップする（無料・GitHub Actions使用）
⑩ GitHubにアップロードする
⑪ GitHub Pagesで公開する（スマホからPWAとして開けるようになる）
⑫ スマホ・タブレットにホーム画面追加する
```

---

## STEP1: Node.jsのインストール

Node.jsは、このアプリを作る・動かすために必要な土台のソフトです。

1. https://nodejs.org/ja にアクセスします。
2. 「LTS」と書かれているバージョン（推奨版）をダウンロードします。
3. ダウンロードしたインストーラーを実行し、指示に従ってインストールします（基本的に「次へ」を押し続けるだけで大丈夫です）。
4. インストールが終わったら、確認をします。
   - Windowsの場合: 「コマンドプロンプト」を開く（スタートメニューで検索）
   - Macの場合: 「ターミナル」を開く（アプリケーション > ユーティリティ の中にあります）
5. 開いた画面に、以下を入力してEnterキーを押します。

```bash
node -v
```

`v20.x.x` のようにバージョン番号が表示されればインストール成功です。

---

## STEP2: プロジェクトファイルの準備

1. このプロジェクト一式（zipファイルなど）をダウンロードし、パソコンの好きな場所に展開（解凍）してください。
   例: `C:\Users\あなたの名前\Documents\humanai`（Windows）
   例: `/Users/あなたの名前/Documents/humanai`（Mac）
2. さきほどのコマンドプロンプト（またはターミナル）で、そのフォルダに移動します。

```bash
cd Documents/humanai
```

※ フォルダを開いた状態で、フォルダのパスをコマンドプロンプトにドラッグ＆ドロップすると、
パスが自動入力されて楽です（`cd ` と入力したあとにドラッグ＆ドロップ）。

3. 必要なライブラリをまとめてインストールします。

```bash
npm install
```

数十秒〜数分かかります。エラーが出ずに終わればOKです。

---

## STEP3: Gemini APIキーの取得

1. https://aistudio.google.com/apikey にアクセスします（Googleアカウントでのログインが必要です）。
2. 「APIキーを作成」（Create API key）ボタンをクリックします。
3. 新しいGoogle Cloudプロジェクトを作るか、既存のプロジェクトを選ぶか聞かれたら、
   「新しいプロジェクトを作成」を選んで進めます。
4. 発行された `AIza` から始まる文字列がAPIキーです。**この画面はまだ閉じずに、
   コピーしてメモ帳などに一時的に貼り付けておいてください**（あとで使います）。

> ⚠️ APIキーは他人に絶対に教えないでください。悪用されると高額請求につながる可能性があります。

---

## STEP4: Firebaseプロジェクトの作成

Firebaseは、ユーザーのログイン管理やチャット履歴の保存に使うGoogleのサービスです。

1. https://console.firebase.google.com/ にアクセスします。
2. 「プロジェクトを作成」をクリックします。
3. プロジェクト名を入力します（例: `humanai-app`）。好きな名前でかまいません。
4. Googleアナリティクスの設定画面が出た場合は、「このプロジェクトでGoogleアナリティクスを
   有効にする」のチェックを外して「プロジェクトを作成」をクリックしても問題ありません（任意機能のため）。
5. プロジェクトの作成が終わったら「続行」をクリックします。

### ウェブアプリを登録する

1. プロジェクトのトップ画面で、`</>`（ウェブ）のアイコンをクリックします。
2. アプリのニックネームを入力します（例: `humanai-web`）。
3. 「Firebase Hosting も設定します」のチェックは**外したままでOK**です（今回はGitHub Pagesを使うため）。
4. 「アプリを登録」をクリックします。
5. 表示される `firebaseConfig` というコードの中の値（apiKey, authDomain, projectId など）を、
   **あとで使うのでこの画面を閉じずにメモしておいてください。** 以下のような形です。

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "humanai-app.firebaseapp.com",
  projectId: "humanai-app",
  storageBucket: "humanai-app.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:xxxxxxxxxxxx"
};
```

6. 「コンソールに進む」をクリックして完了です。

---

## STEP5: Firebase認証の設定

ユーザーのログイン機能（Googleログイン・メール/パスワードログイン）を有効にします。

1. Firebaseコンソールの左メニューから「構築」→「Authentication」を選びます。
2. 「始める」をクリックします。
3. 「Sign-in method」タブを開きます。
4. 一覧から「メール/パスワード」を選び、有効にして保存します。
5. 一覧から「Google」を選び、有効にします。プロジェクトのサポートメールを選択して保存します。

これでログイン機能の準備は完了です。

---

## STEP6: Firestoreの設定

チャット履歴やユーザー情報を保存するデータベースを用意します。

1. Firebaseコンソールの左メニューから「構築」→「Firestore Database」を選びます。
2. 「データベースの作成」をクリックします。
3. ロケーションを選びます（日本からのアクセスなら `asia-northeast1`（東京）がおすすめです）。
4. セキュリティルールは「本番環境モードで開始」を選んで作成します
   （※このあとプロジェクト付属のルールに置き換えるので、どちらを選んでも大丈夫です）。

### セキュリティルールを設定する

1. 作成が終わったら「ルール」タブを開きます。
2. 表示されているルールをすべて削除し、このプロジェクトの `firestore.rules` ファイルの中身を
   すべてコピーして貼り付けます。
3. 「公開」をクリックします。

これで、ユーザーが自分のデータにしかアクセスできないようにする設定が反映されます。

---

## STEP7: 環境変数(.env)の設定

1. プロジェクトフォルダの中にある `.env.example` というファイルをコピーし、
   コピーしたファイルの名前を `.env` に変更してください（先頭のドットを忘れずに）。
2. `.env` ファイルをテキストエディタ（メモ帳やVS Codeなど）で開きます。
3. STEP4でメモしたFirebaseの値と、STEP3で取得したGemini APIキーを、それぞれ入力します。

```env
VITE_FIREBASE_API_KEY=AIzaSy...（Firebaseの値）
VITE_FIREBASE_AUTH_DOMAIN=humanai-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=humanai-app
VITE_FIREBASE_STORAGE_BUCKET=humanai-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:xxxxxxxxxxxx

# STEP9（自律通知）をやらない場合は空欄のままでOKです
VITE_FIREBASE_VAPID_KEY=
```

> Gemini APIキーはこの`.env`には入れません。アプリの「設定」画面から、
> ログイン後にブラウザ上で入力・保存する仕組みになっています（暗号化してこの端末にのみ保存されます）。

4. ファイルを保存します。

---

## STEP8: ローカルで動作確認

1. コマンドプロンプト（ターミナル）で、プロジェクトフォルダの中にいることを確認し、
   以下を実行します。

```bash
npm run dev
```

2. 「Local: http://localhost:5173/」のような表示が出たら成功です。
3. ブラウザ（Chrome推奨）でそのURLを開きます。
4. ログイン画面が表示されるので、「Googleでログイン」またはメールアドレスで新規登録をします。
5. ログイン後、右下（またはサイドバー）の「設定」を開き、STEP3で取得したGemini APIキーを
   貼り付けて保存します。
6. チャット画面に戻り、メッセージを送ってみてください。返信が来れば成功です！

---

## STEP9: 自律通知システムのセットアップ（無料・GitHub Actions方式）

この機能は、AIが会話の様子を見て「今声をかけたほうがいいかも」と自律的に判断し、
プッシュ通知を送る仕組みです。判定処理を定期的に動かし続ける必要がありますが、
本プロジェクトでは **Firebase無料プラン（Sparkプラン）＋GitHub Actionsの無料枠** だけで
実現できるように設計してあります（クレジットカード登録は不要です）。

不要な場合はこのSTEPを丸ごとスキップしてかまいません。他の機能はすべて問題なく動作します。
また、このSTEPだけは他のSTEPよりコマンド操作が多めです。パソコンで作業することをおすすめします。

### 9-1. Cloud Messaging（プッシュ通知）の鍵を発行

1. Firebaseコンソール →「プロジェクトの設定」（歯車アイコン）→「Cloud Messaging」タブを開きます。
2. 「ウェブ構成」の「ウェブ push証明書」の欄で「鍵ペアを生成」をクリックします。
3. 発行された文字列を、`.env` ファイルの `VITE_FIREBASE_VAPID_KEY` に貼り付けます。

### 9-2. Firebase CLIのインストールとログイン

コマンドプロンプト（ターミナル）で以下を実行します。

```bash
npm install -g firebase-tools
firebase login
```

ブラウザが開くので、Firebaseで使っているGoogleアカウントでログインします。

### 9-3. プロジェクトの紐付け

プロジェクトフォルダの中で以下を実行します。

```bash
firebase use --add
```

一覧からSTEP4で作成したFirebaseプロジェクトを選び、エイリアス名は `default` のままEnterでOKです。

### 9-4. 通知チェック用の合言葉（シークレット）を決める

GitHub ActionsからCloud Functionsを呼び出す際、誰でも叩けてしまうと困るため、
合言葉（シークレット文字列）で認証します。好きな英数字の文字列を考えてください
（例: `humanai-secret-8x92kd`。他人に推測されにくいものであれば何でも構いません）。
この文字列は後で2箇所に登録するので、メモしておいてください。

以下のコマンドで、Cloud Functions側にこの合言葉を登録します。

```bash
firebase functions:secrets:set NOTIFY_SECRET
```

聞かれたら、決めた合言葉を入力してEnterを押します。

### 9-5. Cloud Functions用のGemini APIキー登録

自律通知の判定にもGeminiを使うため、サーバー側（Cloud Functions）用のAPIキーを
Firestoreに保存する必要があります。アプリの「設定」画面にはこの項目は表示されないため、
Firebaseコンソールから直接、以下のドキュメントを手動で作成してください。

1. Firestore Database →「データを追加」
2. コレクションID: `users`
3. ドキュメントID: （自分のユーザーUID。Firebaseコンソールの Authentication タブで確認できます）
4. その中にサブコレクション `settings`、ドキュメントID `serverKey` を作成し、
   フィールド `geminiApiKey`（文字列型）にSTEP3のAPIキーを入力します。

### 9-6. Cloud Functionsのデプロイ

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

デプロイが完了すると、ターミナルに以下のようなURLが表示されます。
このURLをメモしておいてください（次のSTEPで使います）。

```
Function URL (checkNotifications): https://asia-northeast1-あなたのプロジェクトID.cloudfunctions.net/checkNotifications
```

### 9-7. GitHubリポジトリにSecretsを登録する

ここから先はブラウザだけで完結します（コマンド操作不要です）。

1. GitHubで、公開したリポジトリのページを開きます（STEP10を先に済ませておいてください）。
2. 「Settings」タブ →左メニューの「Secrets and variables」→「Actions」を開きます。
3. 「New repository secret」を2回クリックして、以下の2つを登録します。

   | Name | Value |
   |---|---|
   | `NOTIFY_URL` | 9-6でメモしたCloud FunctionsのURL |
   | `NOTIFY_SECRET` | 9-4で決めた合言葉 |

4. 登録が終わると、リポジトリに含まれる `.github/workflows/notify.yml` が
   自動的に有効になり、**30分ごと**にGitHub Actionsが通知チェックを実行するようになります。

### 9-8. 動作確認

1. GitHubリポジトリの「Actions」タブを開きます。
2. 「HumanAI 自律通知チェック」というワークフローを選び、右側の「Run workflow」から
   手動で一度実行してみます。
3. 緑のチェックマークが付けば成功です。赤い×が付いた場合は、Secretsの値が
   正しく登録されているか、9-6のURLが正しいかを確認してください。

> ⚠️ GitHub Actionsのcronは、リポジトリに60日間コミットが無いと自動的に停止する仕様があります。
> 長期間使わない期間があった場合は、Actionsタブから「Run workflow」で手動実行すると再開します。

これで、無料の範囲内で自律通知システムが動くようになりました。

---

## STEP10: GitHubへの公開

1. https://github.com/new にアクセスし、新しいリポジトリを作成します
   （リポジトリ名は例: `humanai`。Publicでも Privateでも構いません）。
2. 「README」などの初期ファイルは追加せず、空のリポジトリのまま作成します。
3. コマンドプロンプト（ターミナル）でプロジェクトフォルダに移動し、以下を順番に実行します。

```bash
git init
git add .
git commit -m "Initial commit: HumanAI"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/humanai.git
git push -u origin main
```

`.env` ファイルは `.gitignore` に含まれているため、誤ってAPIキーが公開される心配はありません。

---

## STEP11: GitHub Pagesへのデプロイ（PWA化）

1. `vite.config.js` を開き、以下の行を探します。

```js
base: './',
```

これはそのままで問題ありません（相対パスなのでGitHub Pagesのサブディレクトリ配信にも対応済みです）。

2. ビルドを実行してPWAファイル一式を生成します。

```bash
npm run build
```

`dist` フォルダの中に、スマホでも開けるPWA形式の静的ファイル一式が生成されます。

### gh-pagesで公開する場合

```bash
npm install -D gh-pages
```

`package.json` の `"scripts"` に以下を追加します。

```json
"deploy": "npm run build && npx gh-pages -d dist"
```

保存後、以下を実行します。

```bash
npm run deploy
```

3. GitHubのリポジトリ画面 →「Settings」→「Pages」を開き、
   「Branch」に `gh-pages` を選択して保存します。
4. 数分待つと、`https://あなたのユーザー名.github.io/humanai/` でアプリが公開されます。

### Firebase Authenticationへのドメイン追加（重要）

公開後にログインができない場合は、以下の設定を忘れずに行ってください。

1. Firebaseコンソール →「Authentication」→「Settings」→「承認済みドメイン」
2. 「ドメインを追加」で `あなたのユーザー名.github.io` を追加します。

---

## STEP12: スマホ・タブレットにインストール

公開したURL（`https://あなたのユーザー名.github.io/humanai/`）をスマホのブラウザで開きます。

### iPhone (Safari) の場合
1. 共有ボタン（四角から矢印が出ているアイコン）をタップ
2. 「ホーム画面に追加」を選択

### Android (Chrome) の場合
1. 右上の「⋮」メニューをタップ
2. 「アプリをインストール」または「ホーム画面に追加」を選択

これで、ネイティブアプリのようにホーム画面から起動できるようになります
（UIはスマホ・タブレットの画面幅に自動でフィットします）。

---

## 困ったときは（トラブルシューティング）

**Q. `npm install` でエラーが出る**
→ Node.jsのバージョンが古い可能性があります。STEP1からやり直し、LTS版をインストールしてください。

**Q. ログイン画面から進めない**
→ Firebaseの「Authentication」で、メール/パスワードやGoogleログインが有効になっているか確認してください（STEP5）。

**Q. チャットでメッセージを送ると「APIキーが設定されていません」と出る**
→ アプリ内の「設定」画面からGemini APIキーを保存してください（STEP3・STEP8-5参照）。

**Q. GitHub Pagesで公開したのにログインできない**
→ Firebaseの「承認済みドメイン」に公開先のドメインを追加してください（STEP11末尾）。

**Q. 通知が来ない**
→ STEP9をスキップしている場合、自律通知は動作しません。設定していても、条件を満たさない限り
　通知しない設計のため、来ないこと自体は正常な場合があります。GitHub Actionsの「Actions」タブで
　ワークフローが緑のチェックになっているかも確認してください。

---

## フォルダ構成

```
humanai/
├── README.md              このファイル
├── .env.example            環境変数のサンプル
├── firebase.json           Firebase設定
├── firestore.rules         Firestoreセキュリティルール
├── .github/
│   └── workflows/
│       └── notify.yml       自律通知の定期実行（GitHub Actions）
├── functions/               自律通知システム（Cloud Functions・HTTPトリガー）
│   ├── index.js
│   └── package.json
├── public/
│   ├── icons/                PWA用アイコン
│   └── firebase-messaging-sw.js  プッシュ通知受信用Service Worker
├── src/
│   ├── components/            UIコンポーネント（チャット入力・吹き出し等）
│   ├── engine/                 HumanAI Engine（内部処理ロジック）
│   ├── hooks/                   認証・設定・チャット・通知のロジック
│   ├── lib/                     Firebase・Gemini API・暗号化等のユーティリティ
│   ├── pages/                   ログイン・チャット・設定の各画面
│   ├── App.jsx                  ルーティング
│   ├── main.jsx                 エントリーポイント
│   └── index.css                 スタイル
├── vite.config.js             ビルド設定（PWA設定含む）
├── tailwind.config.js
└── package.json
```

---

## 技術スタック

- **フロントエンド**: React (Vite) + Tailwind CSS + React Router (HashRouter)
- **AI**: Google Gemini API（3.6 Flash / 3.5 Flash Lite）
- **バックエンド**: Firebase (Authentication, Firestore, Cloud Functions, Cloud Messaging)
- **PWA**: vite-plugin-pwa
- **Markdown/数式**: react-markdown, remark-gfm, remark-math, rehype-katex, rehype-highlight
- **グラフ**: Chart.js（将来的な統計機能拡張用）

---

## セキュリティに関する注意

- Gemini APIキーは、ユーザーのFirebase UIDから導出した鍵でAES暗号化したうえで、
  ブラウザのlocalStorageにのみ保存されます。Firestoreなどのサーバーには送信されません。
- Firestoreのセキュリティルールにより、各ユーザーは自分自身のデータにしかアクセスできません。
- 本アプリは個人利用・学習目的を想定しています。不特定多数へ公開運用する場合は、
  Gemini APIの利用上限設定や、Firebaseの予算アラート設定を必ず行ってください。

---

以上で全工程は完了です。何か不明点があれば、各STEPの手順を読み返しながら
一つずつ確認してみてください。良いHumanAIライフを！
