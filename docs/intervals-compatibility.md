# Intervals.icu参考機能とCycleLabの対応範囲

CycleLabは、Intervals.icuが公開している機能説明を、トレーニング指標の要件整理とUI設計の参考にする。ただし、Intervals.icuのソースコード、内部API、画面をコピーせず、CycleLab独自の実装と表示を行う。

## 参考にした公開機能

- Fitness ChartはFitness、Fatigue、FormをPerformance Management Chartとして表示し、CTL、ATL、TSB相当の長期トレーニング負荷を確認する。[1]
- Track Your Progressでは、FTP/eFTP、パワーカーブ、W/kg、活動合計、活動管理、カスタムゾーンなどを提供している。[2]
- 公式トップページでは、活動タイムライン、パワーチャート、ベスト努力、ゾーン分析を活動分析の機能として説明している。[3]

## CycleLabで実装する範囲

- 認証済みユーザーだけの活動一覧。
- 保存済みFITサンプルからのNP、IF、TSS、W/kg、MMP再計算。
- 手動FTPと推定FTPを区別した設定。
- 日次TSSからFitness（CTL）、Fatigue（ATL）、Form（TSB相当）を算出。
- 算出条件が不足する場合は「算出不可」を表示し、AIや推測値で補完しない。

これらは一般的なトレーニング負荷モデルに基づく分析であり、医学的な診断、疲労状態の断定、回復保証ではない。

[1]: https://www.intervals.icu/features/fitness-chart/ "Intervals.icu Fitness Chart"
[2]: https://www.intervals.icu/features/track/ "Intervals.icu Track Your Progress"
[3]: https://www.intervals.icu/ "Intervals.icu公式サイト"
