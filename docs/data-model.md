# CycleLab データモデル方針

Phase 3で実装する永続テーブルは`public.profiles`だけです。認証主体はSupabase Authの`auth.users`で、プロフィールの`id`が`auth.users.id`を参照します。プロフィールは`auth.uid() = id`のRLSで本人だけがSELECT/INSERT/UPDATEできます。DELETEは機能として提供せず、権限も付与しません。

将来のスキーマ案は次のとおりです。`activities`は`id uuid`、`owner_id uuid not null references auth.users(id) on delete cascade`、活動開始時刻、終了時刻、距離、タイトル、作成・更新時刻を持ち、`owner_id, started_at`に複合インデックスを作ります。`activity_samples`は`id uuid`、`activity_id uuid not null references activities(id) on delete cascade`、サンプル時刻、心拍、速度、ケイデンス、位置情報などを持ち、`activity_id, recorded_at`を一意にします。`activity_laps`は`id uuid`、`activity_id`、ラップ番号、開始・終了時刻、距離、平均値を持ち、`activity_id, lap_number`を一意にします。`training_settings`は`owner_id uuid primary key references auth.users(id) on delete cascade`、目標や単位などのユーザー設定を持ちます。

将来テーブルはすべて`owner_id`または親テーブルから所有者を検証できる外部キーを持ち、RLSを有効化します。子テーブルは、親の所有者と現在の`auth.uid()`が一致することをポリシーで確認します。今回のPhaseでは将来テーブルを作成しません。
