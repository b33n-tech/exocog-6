// --- STACK 1 ---
const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const tasksContainer = document.getElementById("tasksContainer");
const clearBtn = document.getElementById("clearBtn");
const archiveBtn = document.getElementById("archiveBtn");
const promptsContainer = document.getElementById("promptsContainer");
const llmSelect = document.getElementById("llmSelect");
const jsonPaste = document.getElementById("jsonPaste");
const sendToModulesBtn = document.getElementById("sendToModulesBtn");

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

function formatDate(iso){ return new Date(iso).toLocaleString(); }

function renderTasks(){
  tasksContainer.innerHTML="";
  tasks.forEach((task)=>{
    const li=document.createElement("li"); li.className="task-item";
    const taskText=document.createElement("div");
    taskText.textContent=task.text + " ("+formatDate(task.date)+")"; taskText.style.cursor="pointer";

    const commentBlock=document.createElement("div"); commentBlock.className="comment-section"; commentBlock.style.display="none";
    const commentList=document.createElement("ul"); commentList.className="comment-list";
    if(task.comments?.length) task.comments.forEach(c=>{
      const cLi=document.createElement("li"); cLi.textContent=`[${formatDate(c.date)}] ${c.text}`; commentList.appendChild(cLi);
    });
    commentBlock.appendChild(commentList);

    const commentInputDiv=document.createElement("div"); commentInputDiv.className="comment-input";
    const commentInput=document.createElement("input"); commentInput.placeholder="Ajouter un commentaire…";
    const commentBtn=document.createElement("button"); commentBtn.textContent="+";
    commentBtn.addEventListener("click",(e)=>{ e.stopPropagation(); const val=commentInput.value.trim(); if(val!==""){ if(!task.comments) task.comments=[]; task.comments.push({text:val,date:new Date().toISOString()}); localStorage.setItem("tasks",JSON.stringify(tasks)); commentInput.value=""; renderTasks(); } });
    commentInputDiv.appendChild(commentInput); commentInputDiv.appendChild(commentBtn); commentBlock.appendChild(commentInputDiv);

    taskText.addEventListener("click",()=>{ commentBlock.style.display = commentBlock.style.display==="none"?"flex":"flex"; });
    li.appendChild(taskText); li.appendChild(commentBlock); tasksContainer.appendChild(li);
  });
}

// Ajouter tâche
addBtn.addEventListener("click",()=>{
  const text=taskInput.value.trim(); if(text!==""){ tasks.push({text,date:new Date().toISOString(),comments:[]}); localStorage.setItem("tasks",JSON.stringify(tasks)); taskInput.value=""; renderTasks(); }
});

// Nettoyer / Archiver
clearBtn.addEventListener("click",()=>{ if(confirm("Es-tu sûr ?")){ tasks=[]; localStorage.removeItem("tasks"); renderTasks(); } });
archiveBtn.addEventListener("click",()=>{
  if(tasks.length===0){ alert("Aucune tâche !"); return; }
  const blob=new Blob([JSON.stringify(tasks,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url;
  a.download=`taches_${new Date().toISOString().slice(0,19).replace(/:/g,"-")}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
});

// Prompts
const promptList=[
  {id:"planifier",label:"Plan",text:"Transforme ces tâches en plan structuré étape par étape :"},
  {id:"prioriser",label:"Priorité",text:"Classe ces tâches par ordre de priorité et urgence :"},
  {id:"categoriser",label:"Catégories",text:"Range ces tâches dans des catégories logiques :"}
];
promptsContainer.innerHTML="";
promptList.forEach(p=>{
  const btn=document.createElement("button"); btn.textContent=p.label;
  btn.addEventListener("click",()=>{
    const combined=p.text + "\n\n" + tasks.map(t=>{
      let str="- "+t.text; if(t.comments?.length) str+="\n  Commentaires :\n"+t.comments.map(c=>`    - [${formatDate(c.date)}] ${c.text}`).join("\n"); return str;
    }).join("\n");
    navigator.clipboard.writeText(combined).then(()=>{ window.open(llmSelect.value,"_blank"); alert("✅ Prompt + tâches copiés et LLM ouvert !"); });
  });
  promptsContainer.appendChild(btn);
});

// --- STACK 2 ---
const modulesContainer = document.getElementById("modulesContainer");

function createModulesFromJSON(json){
  modulesContainer.innerHTML="";
  if(json.jalons?.length){
    const div=document.createElement("div"); div.className="module-header"; div.textContent="Jalons & Sous-actions"; modulesContainer.appendChild(div);
    json.jalons.forEach(j=>{
      const li=document.createElement("div"); li.className="module-item";
      const cb=document.createElement("input"); cb.type="checkbox"; li.appendChild(cb);
      li.appendChild(document.createTextNode(" "+j.titre)); modulesContainer.appendChild(li);
    });
  }
  if(json.messages?.length){
    const div=document.createElement("div"); div.className="module-header"; div.textContent="Mails / Messages"; modulesContainer.appendChild(div);
    json.messages.forEach(m=>{
      const li=document.createElement("div"); li.className="module-item";
      const cb=document.createElement("input"); cb.type="checkbox"; li.appendChild(cb);
      li.appendChild(document.createTextNode(" "+m.sujet+" → "+m.destinataire));
      const note=document.createElement("textarea"); note.className="note"; note.placeholder="Ajouter note…"; li.appendChild(note);
      modulesContainer.appendChild(li);
    });
  }
  if(json.livrables?.length){
    const div=document.createElement("div"); div.className="module-header"; div.textContent="Livrables"; modulesContainer.appendChild(div);
    json.livrables.forEach(l=>{
      const li=document.createElement("div"); li.className="module-item";
      const cb=document.createElement("input"); cb.type="checkbox"; li.appendChild(cb);
      li.appendChild(document.createTextNode(" "+l.titre+" ("+l.type+")"));
      const note=document.createElement("textarea"); note.className="note"; note.placeholder="Ajouter note…"; li.appendChild(note);
      modulesContainer.appendChild(li);
    });
  }
}

// Recevoir JSON depuis Stack1 ou LLM
sendToModulesBtn.addEventListener("click",()=>{
  try{
    const data=JSON.parse(jsonPaste.value.trim());
    createModulesFromJSON(data);
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url;
    a.download=`modules_${new Date().toISOString().slice(0,19).replace(/:/g,"-")}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    alert("✅ Modules générés et JSON téléchargé !");
  }catch(err){ console.error(err); alert("❌ JSON invalide !"); }
});

// Initial render
renderTasks();
