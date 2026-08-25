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
        
        html += '<div style="display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); width: 100%; box-sizing: border-box;">';
        
        html += '<div style="width: 24px; height: 24px; border-radius: 6px; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-size: 10px; color: #6b7280; font-weight: bold; flex-shrink: 0;">' + stepNum + '</div>';
        
        // Icon
        html += '<div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(242,201,76,0.1); color: #f2c94c; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">';
        html += getIcon(task.type);
        html += '</div>';
        
        // Text
        html += '<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; text-align: left;">';
        html += '<div style="font-size: 13px; font-weight: bold; color: #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: ''Inter'', sans-serif;">' + task.label + '</div>';
        html += '<div style="font-size: 11px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: ''Inter'', sans-serif;">' + (task.type === 'subscribe' ? 'Reign Scripts channel' : '@reignscripts') + '</div>';
        html += '</div>';
        
        // Button
        if (state.done) {
            html += '<button style="padding: 6px 16px; border-radius: 8px; border: 1px solid rgba(34,197,94,0.3); background: rgba(34,197,94,0.1); font-size: 11px; font-weight: bold; color: #4ade80; cursor: default;">Done</button>';
        } else if (state.started) {
            html += '<button style="padding: 6px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); font-size: 11px; font-weight: bold; color: #9ca3af; cursor: wait;">...</button>';
        } else {
            html += '<button onclick="startTask(' + i + ')" style="padding: 6px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: #262626; font-size: 11px; font-weight: bold; color: #d1d5db; cursor: pointer; transition: background 0.2s;">Verify</button>';
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
            btn.style.background = "#f2c94c";
            btn.style.color = "#111";
            btn.style.cursor = "pointer";
            btn.style.boxShadow = "0 10px 15px -3px rgba(242,201,76,0.2)";
            btn.innerHTML = "Unlock Hub";
            btn.onclick = unlockSite;
        }
        var pill = document.getElementById("cp-status-pill");
        if (pill) {
            pill.style.background = "rgba(34,197,94,0.1)";
            pill.style.borderColor = "rgba(34,197,94,0.2)";
            pill.style.color = "#22c55e";
            pill.innerHTML = '<svg style="width: 12px; height: 12px;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> ACCESS GRANTED';
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
