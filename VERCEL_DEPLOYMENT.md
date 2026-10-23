# CycleLabをVercelへデプロイする手順

この手順はVercelへの本番デプロイを自動実行しません。Phase 1のコードをVercelで公開できる状態にして、デプロイは利用者が確認した後に実行します。

## 1. Vercelプロジェクトを作成

Vercel DashboardでGitリポジトリをImportし、Framework PresetはVite、Root Directoryはリポジトリルートを選びます。`vercel.json`がSPA rewrite、セキュリティヘッダー、HTTPS前提の設定を提供します。

Build Commandは`pnpm build`、Output Directoryは`dist`、Install Commandは`pnpm install --frozen-lockfile`を使用します。Node.jsはVercelのサポート対象LTSを選び、リポジトリの`packageManager`にあるpnpmバージョンと整合させてください。

## 2. Vercelの環境変数

Vercel DashboardのProject Settings → Environment Variablesで、PreviewとProductionの必要な環境に次の2つを登録します。

```text
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<Supabase DashboardのPublishable Key>
```

`VITE_SUPABASE_URL`はHTTPSのSupabase Project URLだけを設定します。`VITE_SUPABASE_PUBLISHABLE_KEY`にはPublishable Keyだけを設定し、Secret Key、Service Role Key、データベースパスワードは絶対に設定しません。`.env.local`やVercelの値をソースコード・ログ・Gitへコピーしないでください。

Vercelの環境変数はビルド時にViteへ埋め込まれます。したがって、Vercelへ保存するのはブラウザ公開前提のSupabase Publishable Keyだけです。Secret KeyやService Role Keyが必要な機能は、将来サーバー側またはSupabase Edge Functionsなど別の信頼境界を設計してから追加します。

## 3. Supabase側の許可URL

Supabase DashboardのAuthentication → URL Configurationで、利用するVercel Preview URL・Production URLだけをSite URL / Redirect URLsに登録します。少なくとも次のリダイレクト先が必要です。

```text
https://<production-domain>/login
https://<production-domain>/reset-password
```

ワイルドカードを広く許可せず、不要になったPreview URLは削除します。メール確認とパスワード再設定を実アカウントで確認する前に、メール確認必須設定とRedirect URLsを確認してください。

## 4. データベース

`supabase/migrations/202610230001_profiles.sql`を専用のSupabaseプロジェクトへ適用します。適用後、RLSが有効であること、`authenticated`にSELECT/INSERT/UPDATEだけが付与されていること、別ユーザーのプロフィールが読めないことをテストします。Phase 1ではDELETE機能を提供していません。

## 5. デプロイ前チェック

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm build
pnpm audit --prod
```

デプロイ後は、PCとスマートフォンでログイン、メール確認、ログアウト、パスワード再設定、未認証での`/dashboard`アクセスを確認します。本番デプロイ後のHTTPレスポンスで、`Content-Security-Policy`、`Strict-Transport-Security`、`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`が付いていることも確認します。

## 現在のセッションでの状態

Vercel連携候補は存在しますが、連携は有効化されていません。本作業ではVercel本番デプロイを実行していません。上記の設定ファイルと手順をコミット後、Vercel連携を有効化してからデプロイしてください。
