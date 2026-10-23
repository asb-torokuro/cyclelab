# CycleLab Phase 4 実装計画

Phase 1〜3の認証、プロフィール、RLS、最小権限、実Supabaseの2ユーザー回帰テストは完了している。Phase 4ではFITインポートと決定論的なサイクリング分析だけを追加し、Strava連携・AI文章生成・次フェーズ機能は実装しない。

## 実装方針

- React + TypeScript + Viteを維持する。
- FITはブラウザで早期検査し、最大ファイルサイズ、FITシグネチャ、ヘッダ長、data_size、CRC、必須Activity構造、SHA-256重複キーを確認する。ブラウザ検査は信頼境界ではないため、実データ受信と保存は認証済みSupabase Edge Functionで再検査する。
- FIT本体は非公開Storageへ所有者フォルダで保存し、activities、activity_samples、activity_lapsは所有者IDをauth.uid()から導出する。クライアントから送信されたowner_idを認証根拠にしない。
- 同一バイト列はraw_sha256の一意制約で重複拒否する。別エンコードの意味的重複は、正規化したactivity fingerprintを候補として保持するが、誤拒否を避けるためPhase 4では完全一致を確定条件にする。
- 分析はUIから分離した純粋関数にする。欠損値や異常値を0へ変換せず、算出不可を明示する。NP/IF/TSS、CTL/ATL/TSB、MMP/W/kg、時間・距離・速度・標高を単体テストする。
- NPは30秒ローリング平均の4乗平均から4乗根、IF=NP/FTP、TSS=(秒×NP×IF)/(FTP×3600)×100。30秒未満、FTP未設定、無効値がある場合は依存指標を算出不可とする。
- CTL/ATLは日次負荷を42日/7日のEWMAで更新し、TSB=CTL−ATL。休養日は0負荷として明示し、開始直後の過渡期をメタデータで示す。これは医学的な回復・傷害判定ではない。
- FTPはmanual/direct_60m/20m_estimate/ramp_estimateを別管理し、推定値を測定値として表示しない。

## 構成

- `src/lib/fit.ts`: FITバイト列の安全な構造検査、CRC、SHA-256、Recordの正規化。
- `src/lib/analysis.ts`: 型付きの基本指標、MMP、W/kg、NP/IF/TSS、EWMA。
- `src/pages/ImportPage.tsx`: 認証済みのFIT選択・検査・解析開始・状態表示。
- `supabase/migrations`: activities、activity_samples、activity_laps、training_settings、private Storage bucket、所有者RLS、重複制約。
- `supabase/functions/import-fit`: 認証済みユーザー専用の受信再検証と保存入口。秘密キーはEdge Function環境だけで扱い、ブラウザへ出さない。
- `docs/phase4-metrics.md`: 数式、単位、入力条件、欠損・異常値、制限、出典。

## UIと運用

アップロード前にファイルサイズとFIT構造を検査し、処理中・拒否・重複・解析不能・通信失敗を区別する。GPSは活動の所有者だけが取得できる。ファイル名を保存先や権限判定に使わず、サーバー生成IDを使う。FIT解析失敗時に部分データを活動として公開しない。

Vercelへの本番公開はGitHub Write権限が復旧した後に行う。Phase 4実装完了後、型チェック、Lint、ビルド、決定論的単体テスト、秘密情報検査、Supabase RLS監査を実行して停止する。Supabase AuthのLeaked Password Protectionは現行プランでは利用条件があるため、Phase 4の実装・受け入れ条件から除外し、未適用のセキュリティ強化として残存リスクに記録する。

## デザイン

既存のEditorial Utilityを継承する。低彩度背景、白いカード、ライム色のアクセント、大きく読みやすい見出しを使う。インポート状態は色だけに依存せず、文言とアイコンで明示する。モーションは処理中の控えめな進捗表現に限定し、分析結果の数値を装飾より優先する。
