// Data shape saved in localStorage:
// [
//   { id, name, sessions: [ { date: "2026-10-03", sets: [ { weight, reps } ] } ] }
// ]
// A "session" is one day of training for one exercise.

const STORAGE_KEY = "gym-tracker-data";

let exercises = load();

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  // If the browser blocks storage (some do for local files), keep working
  // in memory and warn instead of crashing before the page updates.
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises));
    document.getElementById("storage-warning").hidden = true;
  } catch {
    document.getElementById("storage-warning").hidden = false;
  }
}

function today() {
  // Local date as YYYY-MM-DD
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addExercise(name) {
  exercises.push({ id: Date.now(), name, sessions: [] });
  save();
  render();
}

function addSet(exerciseId, weight, reps) {
  const exercise = exercises.find((e) => e.id === exerciseId);
  let session = exercise.sessions.find((s) => s.date === today());
  if (!session) {
    session = { date: today(), sets: [] };
    exercise.sessions.push(session);
  }
  session.sets.push({ weight, reps });
  save();
  render();
}

function deleteSet(exerciseId, setIndex) {
  const exercise = exercises.find((e) => e.id === exerciseId);
  const session = exercise.sessions.find((s) => s.date === today());
  session.sets.splice(setIndex, 1);
  if (session.sets.length === 0) {
    exercise.sessions = exercise.sessions.filter((s) => s !== session);
  }
  save();
  render();
}

function deleteExercise(exerciseId) {
  if (!confirm("Delete this exercise and all its history?")) return;
  exercises = exercises.filter((e) => e.id !== exerciseId);
  save();
  render();
}

// Most recent session that is not today's.
function previousSession(exercise) {
  return exercise.sessions
    .filter((s) => s.date !== today())
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

// Total volume = sum of weight x reps. Used for the progress hint.
function volume(session) {
  return session.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

function formatSet(s) {
  return `${s.weight} × ${s.reps}`;
}

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

function renderExercise(exercise) {
  const card = el("section", { className: "exercise" });

  const header = el("div", { className: "exercise-header" });
  header.append(
    el("h2", {}, exercise.name),
    el("button", {
      className: "secondary",
      textContent: "Delete",
      onclick: () => deleteExercise(exercise.id),
    })
  );
  card.append(header);

  // Previous session
  const prev = previousSession(exercise);
  const prevLine = el("p", { className: "previous" });
  if (prev) {
    prevLine.textContent = `Last time (${prev.date}): ${prev.sets.map(formatSet).join(", ")}`;
  } else {
    prevLine.textContent = "No previous session yet.";
  }
  card.append(prevLine);

  // Today's sets
  const current = exercise.sessions.find((s) => s.date === today());
  if (current) {
    const list = el("ol", { className: "sets" });
    current.sets.forEach((s, i) => {
      list.append(
        el("li", {}, formatSet(s) + " ", el("button", {
          className: "secondary",
          textContent: "✕",
          title: "Remove set",
          onclick: () => deleteSet(exercise.id, i),
        }))
      );
    });
    card.append(el("p", {}, "Today:"), list);

    if (prev) {
      const diff = volume(current) - volume(prev);
      const note = el("p", {
        className: diff >= 0 ? "progress-up" : "progress-down",
        textContent:
          diff === 0
            ? "Same total volume as last time."
            : `${diff > 0 ? "▲" : "▼"} ${Math.abs(diff)} total volume vs last time`,
      });
      card.append(note);
    }
  }

  // Add set form
  const form = el("form", { className: "set-form" });
  const weight = el("input", { type: "number", placeholder: "Weight", min: 0, step: "any", required: true });
  const reps = el("input", { type: "number", placeholder: "Reps", min: 1, step: 1, required: true });
  form.append(weight, reps, el("button", { type: "submit", textContent: "Add set" }));
  form.onsubmit = (event) => {
    event.preventDefault();
    addSet(exercise.id, Number(weight.value), Number(reps.value));
  };
  card.append(form);

  return card;
}

function render() {
  const list = document.getElementById("exercise-list");
  list.replaceChildren(...exercises.map(renderExercise));
  document.getElementById("empty-message").hidden = exercises.length > 0;
}

document.getElementById("add-exercise-form").onsubmit = (event) => {
  event.preventDefault();
  const input = document.getElementById("exercise-name");
  const name = input.value.trim();
  if (name) addExercise(name);
  input.value = "";
};

render();
