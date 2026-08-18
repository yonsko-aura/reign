const CHECKPOINT_TASKS = [ {
    type: "subscribe",
    label: "Subscribe to Reign Scripts",
    url: "https://www.youtube.com/@reignscripts"
}, {
    type: "like",
    label: "Like the Video",
    url: "https://youtu.be/MkNeFsEvLsc?si=OBU3K0Rr1IgknnYF"
} ];

const COOLDOWN_MS = 1e4;

const taskState = CHECKPOINT_TASKS.map(() => ({
    started: false,
    done: false
}));

function getIcon(type) {
    if (type === "subscribe" || type === "like") {
        return `<svg class="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">\n            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/>\n        </svg>`;
    }
    return `<svg class="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">\n        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>\n    </svg>`;
}

function renderTasks() {
    var container = document.getElementById("cp-tasks");
    var html = "";
    for (var i = 0; i < CHECKPOINT_TASKS.length; i++) {
        var task = CHECKPOINT_TASKS[i];
        var state = taskState[i];
        var stepNum = i + 1;
        html += '<div id="cp-task-' + i + '" class="group relative rounded-2xl border transition-all duration-500 ';
        if (state.done) {
            html += "border-green-500/30 bg-green-500/[0.03]";
        } else {
            html += "border-white/[0.06] bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]";
        }
        html += '">';
        html += '<div class="p-4 sm:p-5">';
        html += '<div class="flex items-center gap-3 mb-4">';
        html += "<div class=\"w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-xs font-bold font-['Orbitron'] flex-shrink-0 ";
        if (state.done) {
            html += 'bg-green-500/20 text-green-400 border border-green-500/30">';
            html += '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>';
        } else {
            html += 'bg-white/[0.06] text-gray-500 border border-white/[0.08]">';
            html += stepNum;
        }
        html += "</div>";
        html += '<div class="flex-1 min-w-0">';
        html += "<h4 class=\"text-sm sm:text-base font-semibold font-['Inter'] truncate ";
        html += state.done ? "text-green-400" : "text-gray-200";
        html += '">' + task.label + "</h4>";
        html += "<p class=\"text-[11px] sm:text-xs text-gray-600 font-['Inter'] mt-0.5\">";
        html += task.type === "subscribe" ? "YouTube Channel" : "YouTube Video";
        html += "</p>";
        html += "</div>";
        if (state.done) {
            html += '<span class="px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] sm:text-xs font-bold flex-shrink-0">DONE</span>';
        } else if (state.started) {
            html += '<span class="px-2.5 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-[10px] sm:text-xs font-bold flex-shrink-0 animate-pulse">VERIFYING</span>';
        } else {
            html += '<span class="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-600 text-[10px] sm:text-xs font-bold flex-shrink-0">PENDING</span>';
        }
        html += "</div>";
        if (state.done) {
            html += "<div class=\"w-full py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold font-['Inter'] flex items-center justify-center gap-2\">";
            html += '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
            html += "Completed";
            html += "</div>";
        } else if (state.started) {
            html += "<div class=\"w-full py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-gray-500 text-sm font-semibold font-['Inter'] flex items-center justify-center gap-3 cursor-not-allowed\">";
            html += '<div class="cp-spinner"></div>';
            html += "Verifying...";
            html += "</div>";
        } else {
            html += '<button onclick="startTask(' + i + ")\" class=\"w-full py-3 rounded-xl bg-gradient-to-r text-sm font-semibold font-['Inter'] flex items-center justify-center gap-2 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 ";
            if (task.type === "subscribe" || task.type === "like") {
                html += 'from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/40">';
            } else {
                html += 'from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40">';
            }
            html += getIcon(task.type);
            html += task.label;
            html += "</button>";
        }
        html += "</div>";
        html += "</div>";
    }
    container.innerHTML = html;
    updateProgress();
}

function startTask(index) {
    var task = CHECKPOINT_TASKS[index];
    window.open(task.url, "_blank");
    taskState[index].started = true;
    renderTasks();
    setTimeout(function() {
        taskState[index].done = true;
        renderTasks();
        checkAllDone();
    }, COOLDOWN_MS);
}

function updateProgress() {
    var done = 0;
    for (var i = 0; i < taskState.length; i++) {
        if (taskState[i].done) done++;
    }
    var total = CHECKPOINT_TASKS.length;
    var pct = total > 0 ? Math.round(done / total * 100) : 0;
    document.getElementById("cp-progress-text").textContent = done + " / " + total;
    document.getElementById("cp-progress-bar").style.width = pct + "%";
}

function checkAllDone() {
    var allDone = true;
    for (var i = 0; i < taskState.length; i++) {
        if (!taskState[i].done) {
            allDone = false;
            break;
        }
    }
    if (allDone) {
        var wrap = document.getElementById("cp-unlock-wrap");
        wrap.classList.remove("opacity-0", "pointer-events-none", "translate-y-4");
        wrap.classList.add("opacity-100", "translate-y-0");
    }
}

function unlockSite() {
    var overlay = document.getElementById("checkpoint-overlay");
    var mainSite = document.getElementById("main-site");
    overlay.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    overlay.style.opacity = "0";
    overlay.style.transform = "scale(1.02)";
    setTimeout(function() {
        overlay.style.display = "none";
        mainSite.classList.remove("hidden");
        document.body.style.overflow = "";
        window.scrollTo(0, 0);
    }, 600);
}

document.addEventListener("DOMContentLoaded", function() {
    renderTasks();
    document.body.style.overflow = "hidden";
});