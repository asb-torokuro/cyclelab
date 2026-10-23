# CycleLab Phase 2 セキュリティ監査（修正前）

実施日: 2026-10-23  
対象: `/home/ubuntu/cyclelab` のPhase 1認証・プロフィール実装  
範囲: 開発用コード、SQLマイグレーション、設定、ビルド成果物、ローカル静的検証  
制約: 外部サービスへの能動的スキャン、第三者システムへのアクセス、大量リクエスト、破壊的操作は実施していない。

## 判定

現時点では **Phase 2未完了** です。Critical / Highの脆弱性は静的レビューでは確認されませんでしたが、Medium相当の修正候補と、Supabase実DB・実アカウント・Vercelレスポンスを確認できていない範囲が残っています。したがって「安全」とは断定しません。

OWASP ASVSはWebアプリケーションの技術的セキュリティ管理策を検証する基準として使用し、OWASP Top 10ではA01 Broken Access Control、A05 Security Misconfiguration、A06 Vulnerable and Outdated Components、A07 Identification and Authentication Failuresを重点評価しました。[1] [2]

## 発見事項

### A-01 — 認証初期化・ログアウト失敗の状態処理が弱い

- **重要度:** Medium
- **対象:** `src/lib/auth.tsx`
- **影響:** `getSession()`の失敗時に単にloadingを解除し、`signOut()`の失敗でもUI側のセッションをnullにできます。通信障害やトークン状態異常を未認証と区別しないため、監視性と状態整合性が不足します。
- **再現条件:** ネットワーク断、トークン失効、Supabase Auth応答エラーを発生させる。外部サービスへの能動テストは未実施。
- **根本原因:** Supabase SDKの戻り値・エラーを明示的な状態として保持していない。
- **修正案:** 初期化エラー状態を追加し、`signOut()`のエラー時は確認結果に基づき安全側に遷移する。保護境界は引き続きRLSとSupabase Authに置く。
- **確認済み証拠:** `pnpm lint`、`pnpm typecheck`、`pnpm build`は成功。
- **未検証:** 実ネットワーク断、期限切れ、signOut失敗時の実挙動。

### A-02 — パスワード再設定フローのイベント同期が不十分

- **重要度:** Medium
- **対象:** `src/pages/ResetPasswordPage.tsx`, `src/lib/supabase.ts`
- **影響:** `getSession()`だけで更新可能状態を判定し、`PASSWORD_RECOVERY`イベント、hash/query交換、別タブ、期限切れ、リプレイとの競合を十分に扱っていません。
- **再現条件:** 実際の再設定メール、期限切れリンク、別タブ、複数回利用を試す。実メール試験は未実施。
- **根本原因:** `detectSessionInUrl: true`と`getSession()`の即時判定に依存。
- **修正案:** Supabaseのリカバリイベントを待ってから更新可能状態にし、異常時は固定メッセージを表示する。Redirect URLはSupabase Dashboard側で本番URLだけを許可する。
- **確認済み証拠:** リダイレクト先は`window.location.origin + '/reset-password'`に固定されている。
- **未検証:** 実メール、hash交換、期限切れ、リプレイ、複数タブ、DashboardのRedirect URLs。

### A-03 — 再設定申請のAPIエラーを成功表示する

- **重要度:** Medium
- **対象:** `src/pages/ForgotPasswordPage.tsx`
- **影響:** `resetPasswordForEmail()`のエラーを無視し、Supabase未設定以外では常に「該当する場合は送信した」と表示します。アカウント列挙耐性は保てますが、通信障害・設定障害をユーザーと運用監視から隠します。
- **再現条件:** Auth APIエラー、レート制限、メール設定障害を発生させる。外部サービスへの能動テストは未実施。
- **根本原因:** SDK戻り値を束縛せず、`setSent(true)`を無条件で実行。
- **修正案:** エラー時もアカウント有無を明かさない汎用エラーを表示し、`finally`で送信中状態を解除する。
- **確認済み証拠:** ソース静的確認。
- **未検証:** 実APIエラー、レート制限、メールプロバイダ障害。

### B-01 — プロフィール関数がクライアントIDを引数に取る

- **重要度:** Medium（現状のRLSにより直接のIDORは未確認）
- **対象:** `src/lib/profile.ts`, `src/pages/DashboardPage.tsx`
- **影響:** 現在の画面は`user.id`を渡しますが、将来の呼び出しミスや改変では他IDを引数にできます。DBのRLSが最終防御であり、RLS適用済みなら他ユーザーの読み書きは拒否される設計です。
- **再現条件:** 偽のIDでselect/insert/updateを呼び出し、RLSが拒否することをテストする。専用Supabaseプロジェクトとテストアカウントがないため未実施。
- **根本原因:** クライアント関数のシグネチャが`userId`を受け取る。
- **修正案:** 関数からID引数を除き、認証済みクライアントの現在ユーザーを内部取得する。なお、RLSを本人確認の唯一の実効境界として維持する。
- **確認済み証拠:** SQLの全ポリシーが`auth.uid() = id`。`anon`全権限revoke、`authenticated`にはSELECT/INSERT/UPDATEのみgrant。
- **未検証:** 実DBへのマイグレーション適用、偽IDのREST試験、2ユーザー間の実RLS試験。

### C-01 — Publishable Keyの誤設定防止策がない

- **重要度:** Low〜Medium
- **対象:** `src/lib/supabase.ts`, `.env.example`, Vercel環境変数運用
- **影響:** Publishable/anon keyはブラウザ公開前提ですが、誤ってSecret KeyやService Role Keyを`VITE_*`へ設定するとビルド成果物に含まれます。
- **修正案:** CIで`VITE_*`へservice-role／秘密鍵パターンが入っていないか検査する。Secret/Service Role Keyはフロントエンドへ設定しない。
- **確認済み証拠:** tracked filesとbuild成果物の秘密情報パターン検索で、service-role、秘密鍵、JWT様トークンは検出なし。`pnpm audit --prod`は既知脆弱性0件。
- **未検証:** Vercel実環境変数、実デプロイ後bundle、キーの種類・ローテーション。

### C-02 — Supabase URLが任意のHTTP(S) URLを許可する

- **重要度:** Medium（設定確認要）
- **対象:** `src/lib/supabase.ts`
- **影響:** 本番環境でHTTP URLや意図しないSupabaseプロジェクトURLを設定すると、接続先と通信機密性を失う可能性があります。
- **根本原因:** `http:`と`https:`を同じく許可し、ホストallowlistを持たない。
- **修正案:** production buildではHTTPSのみを許可し、必要なら想定Supabaseホストをallowlist化する。開発だけlocalhost HTTPを許可する場合は環境ごとに明示する。
- **未検証:** Vercel環境値、TLS、DNS、接続先の正当性。

### D-01 — Vercel用のセキュリティヘッダーとSPA設定がない

- **重要度:** Medium
- **対象:** リポジトリに`vercel.json`等が存在しない。
- **影響:** CSP、HSTS、クリックジャッキング対策、MIME sniffing防止、Referrer Policy、Permissions PolicyがVercel側任せです。またBrowserRouterの深いリンクがVercelで正しくSPAフォールバックされる設定がありません。
- **修正案:** VercelのheadersとSPA rewriteを追加する。CSPはSupabase Auth/APIの接続先、フォント、アプリ自身だけを許可し、HSTSはHTTPS公開を確認してから有効化する。
- **未検証:** 実Vercel Preview/ProductionのHTTPレスポンスヘッダー、rewrite、環境差分。

### D-02 — オープンリダイレクト防御は概ね妥当だが、テスト不足

- **重要度:** Low（未検証）
- **対象:** `src/lib/security.ts`, `src/pages/LoginPage.tsx`
- **評価:** 固定allowlist、`//`拒否、query/hash除去により外部URLを許可しない構造です。
- **修正案:** `safePath`の単体テストを追加し、外部URL・protocol-relative URL・未許可ルートを拒否することを継続確認する。
- **未検証:** 実ブラウザ、Vercel rewrite、深いリンク。

### D-03 — XSS用の危険なHTML描画は静的には確認されない

- **重要度:** Informational
- **対象:** `src/components/FormMessage.tsx`ほか。
- **評価:** `dangerouslySetInnerHTML`、`innerHTML`、HTML文字列描画は検出されません。Reactのtext childrenとして表示しています。
- **残存リスク:** 将来Markdown/HTML表示を追加する場合はサニタイズとCSPが必要です。

### D-04 — Storage保持とSupabase側CORS/Auth設定は未検証

- **重要度:** Medium（設定確認要）
- **対象:** `src/lib/supabase.ts`
- **影響:** `persistSession: true`でブラウザ側にセッションを保持します。自前APIやCookie処理はありませんが、XSS時の影響は大きくなります。Supabase側のCORS、Auth cookie/PKCE、redirect allowlistはコードから確認できません。
- **修正案:** 本番originだけをSupabase側で許可し、Redirect URLsを限定する。セッション有効期限、PKCE、運用監視をDashboardで確認する。
- **未検証:** 実CORS、cookie属性、Storage方式、Supabase Auth設定。

### E-01 — プロフィールの業務ルールがクライアント側に偏る

- **重要度:** Medium（設定確認要）
- **対象:** `supabase/migrations/202610230001_profiles.sql`, `src/lib/profile.ts`
- **影響:** DB側は最大80文字のみで、trimや空文字正規化をクライアントに依存します。直接RESTや将来のクライアントから別形式の値を保存できます。
- **修正案:** DB制約・triggerで必要な正規化を強制し、クライアントだけに業務ルールを置かない。
- **未検証:** 実REST直叩き、Unicode境界、DB role権限。

### E-02 — DB関数権限とmigration適用状態は未検証

- **重要度:** Low
- **対象:** `supabase/migrations/202610230001_profiles.sql`
- **評価:** `SECURITY INVOKER`と`set search_path = public`は比較的安全です。ただし、実DBの関数EXECUTE権限、既存オブジェクト、migration履歴は未確認です。
- **修正案:** 実DBカタログでpolicy、grant、function privilege、migration履歴を照合する。

## 実行した検証

- `pnpm lint`: 成功
- `pnpm typecheck`: 成功
- `pnpm build`: 成功
- `pnpm audit --prod`: 既知脆弱性0件
- tracked filesと`dist`の秘密情報パターン検索: 秘密情報の実値は検出なし。依存ライブラリ中の文字列候補は秘密情報ではないことを文脈確認。
- 外部サービスへのスキャン・侵入試行: 実施していない
- Supabase実DBのRLS試験: 未実施
- 専用テストアカウントによる認証試験: 未実施
- Vercel本番デプロイ: 実施していない

## 次の修正候補

1. Forgot PasswordのSDKエラー処理を追加する。
2. プロフィール関数から外部`userId`引数を除き、現セッション由来にする。
3. Supabase URLのproduction検証を強化する。
4. `vercel.json`でSPA rewriteとセキュリティヘッダーを追加する。
5. `safePath`、プロフィール所有者分離、未認証保護ルートのローカル自動テストを追加する。
6. 必要に応じてAuth初期化・ログアウト・パスワードリカバリイベント処理を強化する。

## 参照

[1]: https://owasp.org/projects/asvs "OWASP Application Security Verification Standard"
[2]: https://owasp.org/Top10/2021/ "OWASP Top 10 2021"
[3]: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html "OWASP Session Management Cheat Sheet"
