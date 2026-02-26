const SUPABASE_URL = "https://knwjtoxliutzwnwuzdaz.supabase.co";
const SUPABASE_KEY = "sb_publishable_9nUDVJom7URGqsUYcFjPsA_rjFe_k6D";

const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: window.sessionStorage
  }
});

/* ================= AUTH CHECK ================= */

async function checkAuth() {
  const { data } = await client.auth.getSession();
  if (!data.session) {
    window.location.href = "login.html";
    return;
  }
}

checkAuth();

const output = document.getElementById("output");
const sectionTitle = document.getElementById("sectionTitle");

document.getElementById("loadIdeas").addEventListener("click", loadIdeas);
document.getElementById("loadProjects").addEventListener("click", loadProjects);
document.getElementById("addBtn").addEventListener("click", () => {
  document.getElementById("formContainer").style.display = "block";
});
document.getElementById("saveBtn").addEventListener("click", saveRecord);

/* ================= LOAD ================= */

async function loadIdeas() {
  sectionTitle.textContent = "Ideas";

  const { data, error } = await client
    .from("AF_idea")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    output.innerHTML = "Error loading ideas";
    return;
  }

  renderIdeas(data);
}

async function loadProjects() {
  sectionTitle.textContent = "USA Projects";

  const { data, error } = await client
    .from("usa_projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    output.innerHTML = "Error loading projects";
    return;
  }

  renderProjects(data);
}

/* ================= SAVE ================= */

async function saveRecord() {
  const title = document.getElementById("titleInput").value;
  const description = document.getElementById("descInput").value;
  const priority = document.getElementById("priorityInput").value;
  const status = document.getElementById("statusInput").value;
  const author = document.getElementById("authorInput").value;

  if (!title) {
    alert("Title required");
    return;
  }

  const isIdeas = sectionTitle.textContent === "Ideas";
  const table = isIdeas ? "AF_idea" : "usa_projects";

  const record = isIdeas
    ? { title, description, priority, status, author }
    : { name: title, description };

  const { error } = await client.from(table).insert([record]);

if (error) {
  console.error(error);
  showToast("Error saving", "error");
  return;
}

showToast("Saved successfully");

  document.getElementById("formContainer").style.display = "none";
  document.getElementById("titleInput").value = "";
  document.getElementById("descInput").value = "";
  document.getElementById("authorInput").value = "";

  isIdeas ? loadIdeas() : loadProjects();
}

/* ================= RENDER IDEAS ================= */

function renderIdeas(data) {
  output.innerHTML = "";

  // ===== STATS =====

const stats = {
  total: data.length,
  high: data.filter(i => i.priority === "High").length,
  medium: data.filter(i => i.priority === "Medium").length,
  low: data.filter(i => i.priority === "Low").length,
  done: data.filter(i => i.status === "Done").length
};

const statsBar = document.createElement("div");
statsBar.className = "statsBar";
statsBar.innerHTML = `
  <div class="statCard">Total<br><span>${stats.total}</span></div>
  <div class="statCard high">High<br><span>${stats.high}</span></div>
  <div class="statCard medium">Medium<br><span>${stats.medium}</span></div>
  <div class="statCard low">Low<br><span>${stats.low}</span></div>
  <div class="statCard done">Done<br><span>${stats.done}</span></div>
`;
output.appendChild(statsBar);

// ===== SEARCH =====

const searchBar = document.createElement("div");
searchBar.className = "searchBar";
searchBar.innerHTML = `
  <input id="liveSearch" placeholder="Search ideas..." />
`;
output.appendChild(searchBar);

  if (!data.length) {
    output.innerHTML = "<p>No records found.</p>";
    return;
  }

  /* FILTER */
  const filterBar = document.createElement("div");
  filterBar.className = "filterBar";
  filterBar.innerHTML = `
    <label>Priority:</label>
    <select id="priorityFilter">
      <option value="all">All</option>
      <option value="Low">Low</option>
      <option value="Medium">Medium</option>
      <option value="High">High</option>
    </select>
  `;
  output.appendChild(filterBar);

  const table = document.createElement("table");
  table.id = "ideasTable";

  table.innerHTML = `
    <thead>
      <tr>
        <th>Date</th>
        <th>Idea</th>
        <th>Description</th>
        <th>Priority</th>
        <th>Status</th>
        <th>Author</th>
        <th></th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  data.forEach(item => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}</td>
      <td>${item.title}</td>
      <td>${item.description || "-"}</td>
      <td class="priority-${(item.priority || "").toLowerCase()}">${item.priority || ""}</td>
      <td class="status-${(item.status || "").toLowerCase().replace(" ", "-")}">
  ${item.status || "-"}
</td>
      <td>${item.author || "-"}</td>
      <td><button class="deleteBtn">Delete</button></td>
    `;
// ===== INLINE EDIT SMART =====

const editableFields = [
  { index: 2, field: "title", type: "text" },
  { index: 3, field: "description", type: "text" },
  { index: 4, field: "priority", type: "select", options: ["Low","Medium","High"] },
  { index: 5, field: "status", type: "select", options: ["New","In Progress","Done"] },
  { index: 6, field: "author", type: "text" }
];

editableFields.forEach(({ index, field, type, options }) => {

  const cell = row.children[index];

  cell.addEventListener("dblclick", () => {

    const oldValue = cell.innerText;

    let editor;

    if (type === "select") {
      editor = document.createElement("select");

      options.forEach(option => {
        const opt = document.createElement("option");
        opt.value = option;
        opt.textContent = option;
        if (option === oldValue) opt.selected = true;
        editor.appendChild(opt);
      });

    } else {
      editor = document.createElement("input");
      editor.type = "text";
      editor.value = oldValue;
    }

    editor.style.width = "100%";
    editor.classList.add("inlineEditor");

    cell.innerHTML = "";
    cell.appendChild(editor);
    editor.focus();

    const saveChange = async () => {

      const newValue = editor.value.trim();
      if (!newValue) {
        cell.innerText = oldValue;
        return;
      }

      await client
        .from("AF_idea")
        .update({ [field]: newValue })
        .eq("id", item.id);

      // Обновляем цвет
      if (field === "priority") {
        cell.className = "priority-" + newValue.toLowerCase();
      }

      if (field === "status") {
        cell.className = "status-" + newValue.toLowerCase().replace(" ", "-");
      }

      cell.innerText = newValue;

      showToast("Updated");
    };

    editor.addEventListener("blur", saveChange);

    editor.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        editor.blur();
      }
    });

  });

});
    row.querySelector(".deleteBtn").addEventListener("click", async () => {

  row.classList.add("fade-out");

  setTimeout(async () => {
    await client.from("AF_idea").delete().eq("id", item.id);
    row.remove();
  }, 300);

});

    tbody.appendChild(row);
  });

  output.appendChild(table);

  /* FILTER LOGIC */
  document.getElementById("priorityFilter")
    .addEventListener("change", (e) => {
      const value = e.target.value;
      const rows = table.querySelectorAll("tbody tr");

      rows.forEach(row => {
        const priorityCell = row.children[3];
        if (value === "all" || priorityCell.innerText === value) {
          row.style.display = "";
        } else {
          row.style.display = "none";
        }
      });
    });

// ===== LIVE SEARCH =====

document.getElementById("liveSearch").addEventListener("input", (e) => {
  const value = e.target.value.toLowerCase();
  const rows = table.querySelectorAll("tbody tr");

  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(value) ? "" : "none";
  });
});

  enableSorting("ideasTable");
}

/* ================= RENDER PROJECTS ================= */

function renderProjects(data) {
  output.innerHTML = "";

  if (!data.length) {
    output.innerHTML = "<p>No records found.</p>";
    return;
  }

  const table = document.createElement("table");

  table.innerHTML = `
    <thead>
      <tr>
        <th>Name</th>
        <th>Description</th>
        <th></th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  data.forEach(item => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${item.name}</td>
      <td>${item.description || "-"}</td>
      <td><button class="deleteBtn">Delete</button></td>
    `;

   row.querySelector(".deleteBtn").addEventListener("click", async () => {

  row.classList.add("fade-out");

  setTimeout(async () => {
    await client.from("AF_idea").delete().eq("id", item.id);
    row.remove();
    showToast("Deleted");
  }, 300);

});

    tbody.appendChild(row);
  });

  output.appendChild(table);
}

/* ================= SORTING ================= */

function enableSorting(tableId) {
  const table = document.getElementById(tableId);
  if (!table) return;

  const headers = table.querySelectorAll("th");

  headers.forEach((header, index) => {
    if (index === headers.length - 1) return;

    header.addEventListener("click", () => {
      const rows = Array.from(table.querySelectorAll("tbody tr"));
      const asc = header.classList.toggle("asc");

      rows.sort((a, b) => {
        const A = a.children[index].innerText.toLowerCase();
        const B = b.children[index].innerText.toLowerCase();
        return asc ? A.localeCompare(B) : B.localeCompare(A);
      });

      const tbody = table.querySelector("tbody");
      tbody.innerHTML = "";
      rows.forEach(row => tbody.appendChild(row));
    });
  });
}
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 50);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}