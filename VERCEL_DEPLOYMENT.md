# CycleLabをVercelへデプロイする手順

## 現在のVercel状態

Vercelプロジェクト`cyclelab`は作成済みです。プロジェクトIDは`prj_3drpGsVvscAUHehSaZwjmMddFhlY`です。`VITE_SUPABASE_URL`と`VITE_SUPABASE_PUBLISHABLE_KEY`はPreview/Production環境へ登録済みです。Secret Key、Service Role Key、データベースパスワードは登録していません。

ただし、現在のManus管理GitリモートはVercelがGit連携で取得できるGitHub等のリモートではないため、自動デプロイのGit接続と初回デプロイは完了していません。Vercelプロジェクト作成と環境変数登録までを実行した状態です。

## Vercel Dashboardでの初回デプロイ

Vercel Dashboardで`cyclelab`プロジェクトを開き、利用可能なGitHubリポジトリをImportするか、Vercel CLIでこのリポジトリをデプロイします。Git接続を選ぶ場合、Framework PresetはVite、Root Directoryはリポジトリルートを選びます。

Build Commandは`pnpm build`、Output Directoryは`dist`、Install Commandは`pnpm install --frozen-lockfile`です。Node.jsはVercelのサポート対象LTSを選び、`package.json`の`packageManager`と整合させます。

## Supabase環境変数

Vercel DashboardのProject Settings → Environment Variablesで、PreviewとProductionに次の2つが登録されていることを確認します。

```text
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<Supabase DashboardのPublishable Key>
```

`VITE_SUPABASE_PUBLISHABLE_KEY`はブラウザ公開前提の値だけを使います。Secret Key、Service Role Key、データベースパスワードを`VITE_*`へ設定しないでください。`.env.local`やVercelの値をソースコード、ログ、Gitへコピーしないでください。

## Supabase側の許可URL

Supabase DashboardのAuthentication → URL Configurationで、実際に利用するVercel Preview URL・Production URLだけをSite URL / Redirect URLsに登録します。少なくとも次のリダイレクト先が必要です。

```text
https://<production-domain>/login
https://<production-domain>/reset-password
```

広いワイルドカードは避け、不要なPreview URLは削除します。メール確認必須設定も有効にしてください。

## データベース

`supabase/migrations/202610230001_profiles.sql`と`202610230002_phase3_hardening.sql`を専用のSupabaseプロジェクトへSupabase CLIまたはSQL Editorで適用します。Publishable Keyだけではマイグレーション適用や管理者権限操作は行わないでください。適用後、RLS、policy、grant、外部キー、DELETE拒否、2ユーザー分離を専用テストアカウントで確認します。

## デプロイ前後の確認

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test -- --run
pnpm build
pnpm audit --prod
```

デプロイ後は、ログイン、メール確認、ログアウト、パスワード再設定、未認証での`/dashboard`アクセスを確認します。さらに、`Content-Security-Policy`、`Strict-Transport-Security`、`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy`が付くことと、`/dashboard`のSPA rewriteを確認します。
