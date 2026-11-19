// The hero's Focus Zen window, made to work: write on the empty line and press
// Enter to add a line, tick a box and the line fades away — as in the app.
// Nothing is stored and nothing is sent; a reload brings back the sample list.
// Without JavaScript the window stays a picture and the "try it" hint stays hidden.

const list = document.querySelector("[data-try-list]");

if (list) {
  document.documentElement.classList.add("js");

  // Turn a line's picture box into a real checkbox button.
  const makeTickable = (line) => {
    const box = document.createElement("button");
    box.type = "button";
    box.className = "box";
    box.setAttribute("aria-label", `Done: ${line.querySelector(".text").textContent}`);
    box.addEventListener("click", () => {
      line.classList.add("is-done");
      box.disabled = true;
      setTimeout(() => line.remove(), 1000);
    });
    line.querySelector(".box").replaceWith(box);
  };

  const newLine = list.querySelector(".is-new");
  for (const line of list.querySelectorAll("li:not(.is-new)")) makeTickable(line);

  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 80;
  input.setAttribute("aria-label", "Write a new line and press Enter");
  input.addEventListener("keydown", (event) => {
    const text = input.value.trim();
    if (event.key !== "Enter" || !text) return;
    const line = document.createElement("li");
    line.innerHTML = '<span class="box"></span><span class="text"></span><span class="age">now</span>';
    line.querySelector(".text").textContent = text;
    makeTickable(line);
    list.insertBefore(line, newLine);
    input.value = "";
  });
  newLine.append(input);
}
