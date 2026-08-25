const CHECKPOINT_TASKS = [ {
    type: "subscribe",
    label: "Subscribe to Reign Scripts",
    url: "https://www.youtube.com/@reignscripts"
}, {
    type: "tiktok",
    label: "Follow on TikTok",
    url: "https://www.tiktok.com/@reignscripts1"
} ];

const COOLDOWN_MS = 1e4;

const taskState = CHECKPOINT_TASKS.map(() => ({
    started: false,
    done: false
}));

function getIcon(type) {
    if (type === "subscribe" || type === "like") {
        return `<svg class="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"/></svg>`;
    }
    if (type === "tiktok") {
        return `<svg class="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`;
    }
    return `<svg class="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg>`;
}

function renderTasks() {
    var container = document.getElementById("cp-tasks");
    var html = "";
    for (var i = 0; i < CHECKPOINT_TASKS.length; i++) {
        var task = CHECKPOINT_TASKS[i];
        var state = taskState[i];
        var stepNum = i + 1;
        
        html += '<div class="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">';
        html += '<div class="w-6 h-6 rounded bg-black/50 flex items-center justify-center text-[10px] text-gray-500 font-bold flex-shrink-0">' + stepNum + '</div>';
        
        // Icon
        html += '<div class="w-8 h-8 rounded-lg bg-[#f2c94c]/10 text-[#f2c94c] flex items-center justify-center flex-shrink-0">';
        html += getIcon(task.type);
        html += '</div>';
        
        // Text
        html += '<div class="flex-1 min-w-0">';
        html += '<div class="text-[13px] font-bold text-gray-200 truncate">' + task.label + '</div>';
        html += '<div class="text-[11px] text-gray-500 truncate">' + (task.type === 'subscribe' ? 'Reign Scripts channel' : '@reignscripts') + '</div>';
        html += '</div>';
        
        // Button
        if (state.done) {
            html += '<button class="px-4 py-1.5 rounded-lg border border-green-500/30 bg-green-500/10 text-[11px] font-bold text-green-400 cursor-default">Done</button>';
        } else if (state.started) {
            html += '<button class="px-4 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[11px] font-bold text-gray-400 cursor-wait">...</button>';
        } else {
            html += '<button onclick="startTask(' + i + ')" class="px-4 py-1.5 rounded-lg border border-white/10 bg-[#262626] hover:bg-[#333] text-[11px] font-bold text-gray-300 transition-colors">Verify</button>';
        }
        
        html += '</div>';
    }
    container.innerHTML = html;
    updateProgress();
}

function startTask(index) {
    var task = CHECKPOINT_TASKS[index];
    window.open(task.url, "_blank", "noopener,noreferrer");
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
    var pb = document.getElementById("cp-progress-bar"); if(pb) pb.style.width = pct + "%";
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
        var btn = document.getElementById("cp-main-btn");
        if (btn) {
            btn.className = "w-full py-3.5 rounded-xl bg-[#f2c94c] hover:bg-[#f5d370] text-[#111] font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 shadow-lg shadow-yellow-500/20";
            btn.innerHTML = "Unlock Hub";
            btn.onclick = unlockSite;
        }
        var pill = document.getElementById("cp-status-pill");
        if (pill) {
            pill.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-bold tracking-widest uppercase mb-4";
            pill.innerHTML = '<svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> ACCESS GRANTED';
        }
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
});


// CodeRabbit trigger


window.isPreviewMode = false;

function skipCheckpoint() {
    window.isPreviewMode = true;
    document.getElementById("checkpoint-overlay").classList.add("opacity-0", "pointer-events-none");
    setTimeout(function() {
        document.getElementById("checkpoint-overlay").classList.add("hidden");
        document.getElementById("main-site").classList.remove("hidden");
        document.body.style.overflow = "auto";
    }, 500);
}

function enforceCheckpoint(e) {
    if (window.isPreviewMode) {
        e.preventDefault();
        e.stopPropagation();
        
        // Show checkpoint again
        document.getElementById("checkpoint-overlay").classList.remove("hidden");
        // tiny delay to allow display:block to apply before animating opacity
        setTimeout(function() {
            document.getElementById("checkpoint-overlay").classList.remove("opacity-0", "pointer-events-none");
            document.body.style.overflow = "hidden";
        }, 10);
        return false;
    }
}
