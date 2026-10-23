# Phase 4 分析方式

CycleLab Phase 4は決定論的な計算だけを行う。AIに数値を推測させない。標準仕様や公開情報で入力条件が不足している場合は`算出不可`を返す。

FITの受信では、ファイル名やMIMEを信頼せず、50 MiB上限、ヘッダー長、`.FIT`シグネチャ、data_size、全体長、CRCを検査する。完全同一バイト列の重複キーはraw FIT bytesのSHA-256とする。クライアント検査は早期フィルタであり、Edge Function側でも再検査する。

距離は信頼できる累積距離を優先し、速度は距離差/時刻差とする。経過時間と移動時間は分離する。標高上昇量は平滑化とデッドバンドを前提とし、標高データがない場合は算出不可とする。パワー、心拍、ケイデンスの欠損はnullで保持し、プロトコルinvalid sentinelを0へ変換しない。power=0は停止・惰性走行の有効値になり得る。

ベストパワーは、各継続時間の連続有効ウィンドウの平均パワーの最大値（MMP）とする。W/kgはパワーを体重kgで割る。FTPは手動設定、60分直接テスト、20分×0.95推定、ランプ×0.75推定を別種別として保存し、推定値を実測値として表示しない。

NPは30秒移動平均を4乗し、その平均の4乗根。IFはNP/FTP。TSSは`(duration_seconds × NP × IF) / (FTP × 3600) × 100`。30秒未満、FTP未設定、無効なパワーでは依存値を算出不可にする。CTL/ATLは日次TSSのEWMAで、デフォルト時定数は42日/7日、TSBはCTL−ATL。これらは相対的なトレーニング負荷の指標であり、回復完了や傷害リスクを断定しない。

## 出典

[1]: https://developer.garmin.com/fit/protocol/ "Garmin FIT Protocol"
[2]: https://developer.garmin.com/fit/articles/cookbook/isfit_checkintegrity_read.html "Garmin FIT integrity"
[3]: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html "OWASP File Upload Cheat Sheet"
[4]: https://www.trainingpeaks.com/learn/articles/normalized-power-intensity-factor-training-stress/ "TrainingPeaks NP IF TSS"
[5]: https://help.trainingpeaks.com/hc/en-us/articles/204071804-Normalized-Power "TrainingPeaks Normalized Power"
[6]: https://www.trainingpeaks.com/learn/articles/the-science-of-the-performance-manager/ "TrainingPeaks Performance Manager"
[7]: https://www.intervals.icu/features/analyze/ "Intervals.icu Analyze"
[8]: https://www.intervals.icu/features/fitness-chart/ "Intervals.icu Fitness Chart"
[9]: https://www.trainingpeaks.com/coach-blog/all-about-the-mean-max-power-curve/ "TrainingPeaks Mean Max Power Curve"
