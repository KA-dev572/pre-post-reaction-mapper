function mainProcess(e) {
  //Googleフォームからの投稿に対し、dict記載の誤解されがちなワードを検知。
  //投稿内容を収集
  let content = e.namedValues; //連想配列形式, 値は文字列の配列からなる
  // Logger.log(content);  //{メールアドレス=[YOUR_ADDRESS], タイムスタンプ=[yyyy/MM/dd HH:mm:SS] 投稿予定日=[yyyy/MM/dd], 投稿予定の内容=[TEXT]}
  //これを投げて適切にチェックできるように別関数を作って開発

  //ワードチェック
  //1なら投稿タイムスタンプと比較して日付が近ければ「時期悪い」判定
  //2なら誤解されやすい判定
  let reply = wordCheck(content, dict);
  Logger.log(reply);

  //出力：今のところメール通知想定だが…
  GmailApp.sendEmail(reply[0],"【自動送信】結果をお知らせします", reply[1]);

}

function wordCheck (eObj, fixedObj=dict) {
  //イベントで発生した連想配列と固定のdictを比較してチェック
  // eObj = {
  //   メールアドレス:["YOUR_ADDRESS"], 
  //   タイムスタンプ:["yyyy/MM/dd HH:mm:SS"], 
  //   投稿予定日:["yyyy/MM/dd"], 
  //   投稿予定の内容:["TEXT"]
  // }; //実験用
  //返信先
  let to = eObj.メールアドレス[0];
  //出力用の箱
  let body = "";
  //まず投稿内容にワードが含まれているか
  let objText = eObj.投稿予定の内容[0];
  let objDate = Utilities.formatDate(new Date(eObj.投稿予定日[0]),"JST","MM-dd");
  // Logger.log(objText); 
  for (const word in fixedObj) {  //keyになる語を巡回
    // Logger.log(word);
    if (objText.includes(word)) { //含まれている場合
      let notes = []; //最後にbodyにまとめる
      if (fixedObj[word].axes.includes(1)) {  //1含意ありなら
        if (fixedObj[word].dates.includes(objDate)) { //特定の日付に該当
          notes.push("この語は、特定の日付に発生した事件を想起させ、意図しない文脈で受け取られる可能性があります。");
        }
      }
      if (fixedObj[word].axes.includes(2)) {  //2含意ありなら
        notes.push("この語は、近年では侮蔑・嘲笑・差別と解釈されることが増えています。");
      } 
      let freqNote = frequencyCheck(to, word);  //辞書にある＝1か2かどちらかなので、
      if (freqNote) notes.push(freqNote); //  3に該当していればそれを通知文に突っ込む
      //notesに該当があれば（多分この一番大きなif文に嵌った段階で該当はある？）
      if (notes.length>0) {
        body = `検出ワード：${word}\n\n${notes.join("\n")}\n${fixedObj[word].note}`;  //配列.join(str)で、要素をstrで結合した文字列を作れる
      }
    }
  }
  if (body == "") {
    body = "留意すべき語は見当たりません。";
  }
  // Logger.log(body);
  return [to, body];
}

//3 投稿頻度に関するチェック
function frequencyCheck(userId, word) {
  //PropertiesServiceはgas内の永続ストレージ。なんかkey-valueという連想配列っぽい構造らしいが一個だけ
  const props = PropertiesService.getScriptProperties();  //その全体を取得
  const key = `FREQ::${userId}::${word}`; //keyを設定
  const now = Date.now(); //時期を数値で→厳密には投稿時間ではないので、連投の「可能性」のみ示唆

  const last = props.getProperty(key);  //ストレージから上記のキーに相当する値を取得
  props.setProperty(key, now.toString()); //該当ワードがあれば新しい時間帯を上書き

  if (!last) return null; //該当なしならnull

  const diffHours = (now - Number(last)) / 3600000; //前回フォーム送信時と今回との比較
  if (diffHours < 24) {
    return `※この語は24時間以内に使用された可能性があります（${diffHours.toFixed(1)}時間前に本フォームに送信がありました）`;
  }
  return null;  //24h以上経過ならnull
}

/**これからやるとすると1　メールアドレスは後で匿名化処理が可能
 * これからやるとすると2　日付は数値として扱う？→あまり意味がないので後回し
 */
