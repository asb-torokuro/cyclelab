# CycleLab Phase 2 修正後監査・Phase 3回帰結果

## 判定

静的監査とローカル回帰テストではCritical / Highは検出されませんでした。Phase 2修正対象はコード上で対応済みです。ただし、専用Supabaseプロジェクトを使った2ユーザーRLS試験、実メールによる認証・再設定試験、Vercelの実デプロイ後HTTPヘッダー確認は未実施のため、実環境まで含めた完全合格とは判定しません。

## 修正内容

- `AuthProvider`で`getSession()`のエラーを明示的に保持し、認証状態を安全側に扱うようにした。
- ログアウト失敗時にUIだけをログアウト済みにしないようにした。
- パスワード再設定申請でSDKエラーを処理し、アカウント有無を開示しない汎用エラーを表示するようにした。
- パスワード再設定画面で`PASSWORD_RECOVERY`/`INITIAL_SESSION`イベントを監視し、更新完了後にセッションを終了するようにした。
- プロフィール関数から外部`userId`引数を削除し、Supabase Authの現在ユーザーから所有者IDを取得するようにした。
- Supabase URLは本番ではHTTPSかつ`*.supabase.co`、ローカル開発ではlocalhost HTTPだけを許可するようにした。
- DB hardening migrationでプロフィールのtrim後長さ制約とDELETE権限の明示的拒否を追加した。
- Vercel用SPA rewriteとセキュリティヘッダーを維持した。
- `safePath`、RLS SQL契約、アカウント列挙耐性をVitestで自動検査した。

## 実行済みテスト

- `pnpm typecheck`: 成功
- `pnpm lint`: 成功
- `pnpm test -- --run`: 成功、2ファイル4テスト
- `pnpm build`: 成功
- `pnpm audit --prod`: 既知脆弱性0件（直近監査結果）
- Vercel JSONとルートマニフェストのJSON検証: 成功
- `git diff --check`: 成功
- Secret Key / Service Role Keyパターン検査:検出なし
- FIT解析・Strava・トレーニング分析のスコープ検査:検出なし
- PC・スマートフォン幅のログイン、登録、再設定申請画面: スクリーンショット確認済み

## 未検証

専用のテスト用Supabaseプロジェクトとテストアカウントが未提供のため、以下は未実施です。

- 2ユーザー間のプロフィールSELECT/INSERT/UPDATE拒否
- DELETE拒否の実DB検証
- DBマイグレーション適用後のpolicy、grant、外部キー、インデックスのカタログ照合
- メール確認、ログイン、ログアウト、再設定リンク、期限切れリンク、セッション期限切れ
- 実SupabaseのCORS、Auth設定、Redirect URLs
- Vercel実デプロイ後のHTTPヘッダーとSPA rewrite

## 残存リスク

Vercelプロジェクト`cyclelab`は作成され、`VITE_SUPABASE_URL`と`VITE_SUPABASE_PUBLISHABLE_KEY`はPreview/Productionへ登録済みです。ただし、現在のリポジトリをVercel Git連携へ接続していないため、実デプロイは未実行です。Vercel DashboardでGitHub等の利用可能なリモートリポジトリを接続するか、Vercel CLI/ダッシュボードからこのコードをデプロイして、上記の実環境確認を行う必要があります。
