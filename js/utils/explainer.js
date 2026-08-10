// 量子力学を知らない人向けの「何ができる?」解説ドロップダウン (各画面右上に配置)
export function mountBeginnerBox(container, { what, analogy, steps }) {
  const stepsHtml = steps.map(s => `<li>${s}</li>`).join('');
  container.innerHTML = `
    <button class="beginner-toggle-btn" type="button" aria-expanded="false">
      <span class="icon">🔰</span> 初めての方へ <span class="chevron">▾</span>
    </button>
    <div class="beginner-dropdown">
      <h4>🔰 ここで何が分かる?</h4>
      <p>${what}</p>
      <div class="analogy">💡 たとえるなら: ${analogy}</div>
      <ol>${stepsHtml}</ol>
    </div>
  `;
  const btn = container.querySelector('.beginner-toggle-btn');
  const dropdown = container.querySelector('.beginner-dropdown');
  btn.addEventListener('click', () => {
    const open = dropdown.classList.toggle('open');
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  });
}
