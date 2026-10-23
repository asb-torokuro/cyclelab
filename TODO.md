# CycleLab Phase 3 TODO

- [x] Phase 1のメール認証、メール確認、再設定、保護ルート、プロフィールRLS、環境変数管理を実装済み。
- [x] Phase 2の静的セキュリティ監査を実施し、Critical / High未検出を確認。Medium修正を実装中。
- [ ] Phase 2回帰: 認証初期化・ログアウト失敗、再設定イベント、偽IDプロフィール、2ユーザーRLSを専用Supabaseで確認する。
- [ ] Phase 3ダッシュボード: 認証済みユーザーが共通ナビゲーション、プロフィール表示・編集、ローディング、空データ、エラー、再試行を利用できる。
- [ ] DB管理: profilesのhardening migrationを適用し、全テーブルのRLS、policy、grant、外部キー、インデックスを確認する。
- [ ] Vercel: Vercel環境変数を設定し、Preview/Productionのビルド、SPA rewrite、HTTPセキュリティヘッダーを確認する。
- [x] FIT解析、Strava連携、トレーニング分析、ライド記録はPhase 3では実装しない。
