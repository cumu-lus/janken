// Firebaseの設定（あなたのものを使用）
const firebaseConfig = {
  apiKey: "AIzaSyDgxB6u1Q0CWW4eFX_OzNvlQcIMtdGXuTU",
  authDomain: "janken-55e55.firebaseapp.com",
  databaseURL: "https://janken-55e55-default-rtdb.firebaseio.com",
  projectId: "janken-55e55",
  storageBucket: "janken-55e55.firebasestorage.app",
  messagingSenderId: "418171666945",
  appId: "1:418171666945:web:a630bb1dc7a08354d7f600",
  measurementId: "G-0N090S3QR5"
};

// 初期化チェック
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized");
} catch (e) {
    console.error("Firebaseの初期化に失敗しました。設定を確認してください:", e);
}

const database = firebase.database();
let currentRoomId = "";
let playerRole = ""; 
let roomRef;

// 1. 新しい部屋を作る
function createRoom() {
    const roomId = Math.floor(1000 + Math.random() * 9000).toString(); 
    currentRoomId = roomId;
    console.log("Generated Room ID:", roomId); // デバッグ用
    setupGameUI(); 
    enterRoom(roomId);
}

// 2. 既存の部屋に入る
function joinRoom() {
    const roomId = document.getElementById('room-id-input').value;
    if (!roomId) return alert("IDを入力してください");
    currentRoomId = roomId;
    setupGameUI(); 
    enterRoom(roomId);
}

// 3. UIを切り替える
function setupGameUI() {
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('game-screen').style.display = 'block';
    document.getElementById('display-room-id').innerText = currentRoomId;
}

// 4. 部屋への入場
function enterRoom(roomId) {
    roomRef = database.ref('rooms/' + roomId);

    roomRef.once('value').then((snapshot) => {
        const data = snapshot.val();
        
        if (!data || !data.p1) {
            playerRole = "p1";
            roomRef.update({ p1: { choice: "" } });
        } else if (!data.p2) {
            playerRole = "p2";
            roomRef.update({ p2: { choice: "" } });
        } else {
            alert("この部屋は満員です");
            location.reload();
            return;
        }

        document.getElementById('status').innerText = 
            `あなたは ${playerRole === 'p1' ? '先攻(P1)' : '後攻(P2)'} です。相手を待っています...`;
        
        listenForUpdates();
    }).catch((err) => {
        alert("Firebaseに接続できません。ルール設定を確認してください。");
        console.error(err);
    });
}

// --- 修正版：じゃんけんの手を送信 ---
function play(choice) {
    // 自分の手を更新
    roomRef.child(playerRole).update({ choice: choice });
    
    // UIの変更：自分の手を選んだらボタンを消し、メッセージを出す
    document.getElementById('game-area').style.display = 'none';
    document.getElementById('status').innerText = "あなたの選択（" + translate(choice) + "）を送信しました。相手を待っています...";
}

// 日本語変換用
function translate(choice) {
    if (choice === 'rock') return '✊グー';
    if (choice === 'paper') return '✋パー';
    if (choice === 'scissors') return '✌️チョキ';
    return '';
}

// --- 修正版：データの監視 ---
function listenForUpdates() {
    roomRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // 1. 二人揃っているか確認
        if (data.p1 && data.p2) {
            
            // 2. 両方が手を選んだか確認
            if (data.p1.choice && data.p2.choice) {
                // 【結果表示フェーズ】
                const result = getWinner(data.p1.choice, data.p2.choice);
                
                // 自分の手と相手の手を判定
                const myChoice = data[playerRole].choice;
                const opponentRole = (playerRole === 'p1') ? 'p2' : 'p1';
                const opponentChoice = data[opponentRole].choice;

                // 結果を表示
                document.getElementById('status').innerText = "試合終了！"; // 「待っています」を上書き
                document.getElementById('result').innerText = 
                    `あなた: ${translate(myChoice)} \n 相手: ${translate(opponentChoice)} \n\n ${result}`;
                
                document.getElementById('game-area').style.display = 'none';
                document.getElementById('reset-btn').style.display = 'inline-block';
            } 
            else {
                // 【待機フェーズ】
                // 自分がまだ選んでいない場合だけ、ボタンを表示する
                if (!data[playerRole].choice) {
                    document.getElementById('game-area').style.display = 'block';
                    document.getElementById('status').innerText = "じゃんけん...ぽん！手を選んでください。";
                } else {
                    // 自分は選んだけど、相手がまだの場合
                    document.getElementById('game-area').style.display = 'none';
                    document.getElementById('status').innerText = "相手が選ぶのを待っています...";
                }
                // 結果エリアは隠しておく
                document.getElementById('result').innerText = "";
                document.getElementById('reset-btn').style.display = 'none';
            }
        } else {
            // 【人数不足フェーズ】
            document.getElementById('status').innerText = "相手が部屋に入るのを待っています...";
            document.getElementById('game-area').style.display = 'none';
        }
    });
}

function getWinner(p1, p2) {
    if (p1 === p2) return "引き分け！";
    const winMap = { rock: "scissors", paper: "rock", scissors: "paper" };
    if (winMap[p1] === p2) return "Player 1 の勝ち！";
    return "Player 2 の勝ち！";
}

function resetGame() {
    document.getElementById('result').innerText = "リセット中...";
    roomRef.update({
        "p1/choice": "",
        "p2/choice": ""
    }).then(() => {
        // 更新が完了したらUIを整える
        document.getElementById('reset-btn').style.display = 'none';
    });
}