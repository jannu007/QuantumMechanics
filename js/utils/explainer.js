// 量子力学を知らない人向けの「何ができる?」解説ボックスを生成する共通ヘルパー
export function beginnerBox({ what, analogy, steps }) {
  const stepsHtml = steps.map(s => `<li>${s}</li>`).join('');
  return `
    <div class="beginner-box">
      <h4>🔰 初めての方へ: ここで何が分かる?</h4>
      <p>${what}</p>
      <div class="analogy">💡 たとえるなら: ${analogy}</div>
      <ol>${stepsHtml}</ol>
    </div>
  `;
}
