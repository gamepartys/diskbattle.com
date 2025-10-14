/* GENEL TASARIM */
body {
  margin: 0;
  background-color: #0e1217;
  color: #fff;
  font-family: 'Segoe UI', Arial, sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  overflow: hidden;
}

.hidden {
  display: none;
}

/* ANA KART */
#menu {
  background: #121826;
  border: 1px solid #1c2433;
  border-radius: 16px;
  padding: 40px;
  width: 420px;
  text-align: center;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.4);
  animation: fadeIn 0.5s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* BAŞLIK */
h1 {
  margin-bottom: 30px;
  font-size: 1.8em;
  color: #4da3ff;
}

/* INPUTLAR */
input {
  width: 85%;
  padding: 12px;
  margin: 12px 0;
  border: none;
  border-radius: 8px;
  background-color: #1c2331;
  color: #fff;
  font-size: 1rem;
  outline: none;
  text-align: center;
  transition: background 0.3s;
}

input:focus {
  background-color: #232c3f;
}

/* BUTONLAR */
button {
  width: 90%;
  padding: 12px;
  margin: 10px 0;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  color: white;
  transition: background 0.25s, transform 0.1s;
}

button:active {
  transform: scale(0.97);
}

.primary {
  background-color: #007bff;
}

.primary:hover {
  background-color: #0063d1;
}

.secondary {
  background-color: #2b3244;
}

.secondary:hover {
  background-color: #363e53;
}

/* MESAJ ALANI */
#message {
  margin-top: 20px;
  font-size: 1rem;
  color: #aaa;
}

/* LOBBY BİLGİLERİ */
#lobbyInfo {
  margin-top: 20px;
  background-color: #1a2132;
  border-radius: 12px;
  padding: 15px;
  font-size: 0.9rem;
  color: #cdd4e1;
  word-break: break-all;
}

#lobbyInfo span {
  color: #4da3ff;
  font-weight: bold;
}
