# CycleLab Phase 3 実装計画

Critical / Highの未解決問題はPhase 2監査で確認されていないため、実装を進める。既存のReact + TypeScript + Vite、Supabase Auth、Supabase PostgreSQL、Vercel構成を維持する。

Phase 2修正では、認証初期化・ログアウトのエラー状態、パスワード再設定申請のAPIエラー処理、プロフィール関数の現在セッション由来ID化、DB側の所有者制約を強化する。Phase 3では、認証済みダッシュボードに共通ナビゲーション、本人プロフィール表示・編集、ローディング、エラー、再試行を実装する。DBはprofilesのhardening migrationだけを追加し、将来テーブルは設計文書に留める。

構成は`src/components`に共通UI、`src/lib`に認証・プロフィール・セキュリティ、`src/pages`にルート画面、`supabase/migrations`に再現可能なSQL、`docs`にデータモデルとバックアップ方針を置く。Vercel向けの`vercel.json`は既存設定を維持し、デプロイ後に環境変数とHTTPヘッダーを確認する。

デザインは既存のEditorial Utilityを継承する。余白、読みやすい大見出し、ライム色のアクセント、低彩度の背景を使い、ナビゲーションと状態表示を明確にする。アニメーションは最小限とし、認証やプロフィール操作の状態を優先する。
