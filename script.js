// --- STACK 1 ---
const taskInput=document.getElementById("taskInput");
const addBtn=document.getElementById("addBtn");
const tasksContainer=document.getElementById("tasksContainer");
const buttonsRow=document.querySelector(".buttons-row");
const jsonPaste=document.getElementById("jsonPaste");
const pushToModulesBtn=document.getElementById("pushToModulesBtn");
const promptsContainer=document.getElementById("promptsContainer");
const copiedMsg=document.getElementById("copiedMsg");
const llmSelect=document.getElementById("llmSelect");
const modulesContainer=document.getElementById("modulesContainer");

let tasks=JSON.parse(localStorage.getItem("tasks"))||[];

function formatDate(iso){const d=new Date(iso);return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}

function renderTasks(){
  tasksContainer.innerHTML="";
  tasks.slice().sort((a,b)=>new Date(a.date)-new Date(b.date))
    .forEach(task=>{
      const li=document.createElement("li"); li.className="task-item";
      const taskText=document.createElement("div"); taskText.className="task-text"; taskText.textContent=task.text+" (ajoutée le "+task.date.split("T")[0]+")";
      const commentBlock=document.createElement("div"); commentBlock.className="comment-section"; commentBlock.style.display="none";
      const commentList=document.createElement("ul"); if(task.comments?.length){task.comments.forEach(c=>{const cLi=document.createElement("li");cLi.textContent=`[${formatDate(c.date)}] ${c.text}`; commentList.appendChild(cLi);})} commentBlock.appendChild(commentList);
      const commentInputDiv=document.createElement("div"); const commentInput=document.createElement("input"); commentInput.placeholder="Ajouter un commentaire…"; const commentBtn=document.createElement("button"); commentBtn.textContent="+"; commentBtn.addEventListener("click",()=>{const val=commentInput.value.trim(); if(val!==""){if(!task.comments) task.comments=[]; task.comments.push({text:val,date:new Date().toISOString()}); localStorage.setItem("tasks",JSON.stringify(tasks)); commentInput.value=""; renderTasks();}}); commentInputDiv.appendChild(commentInput); commentInputDiv.appendChild(commentBtn); commentBlock.appendChild(commentInputDiv);
      li.appendChild(taskText); li.appendChild(commentBlock);
      taskText.addEventListener("click",()=>{commentBlock.style.display=commentBlock.style.display==="none"?"flex":"flex";});
      tasksContainer.appendChild(li);
    });
}
addBtn.addEventListener("click",()=>{const text=taskInput.value.trim(); if(text!==""){tasks.push({text,date:new Date().toISOString(),comments:[]}); localStorage.setItem("tasks",JSON.stringify(tasks)); taskInput.value=""; renderTasks();}});

// Tout nettoyer
const clearBtn=document.createElement("button"); clearBtn.textContent="🧹 Tout nettoyer"; clearBtn.addEventListener("click",()=>{if(confirm("Es-tu sûr ?")){tasks=[]; localStorage.removeItem("tasks"); renderTasks(); alert("✅ Supprimé");}}); buttonsRow.appendChild(clearBtn);
// Archiver
const archiveBtn=document.createElement("button"); archiveBtn.textContent="📂 Archiver"; archiveBtn.addEventListener("click",()=>{if(tasks.length===0){alert("Aucune tâche"); return;} const blob=new Blob([JSON.stringify(tasks,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`taches_${new Date().toISOString().slice(0,19).replace(/:/g,"-")}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a);}); buttonsRow.appendChild(archiveBtn);

// Prompts tâches
const prompts=[{id:"planifier",label:"Plan",text:"Transforme ces tâches en plan structuré étape par étape :"}, {id:"prioriser",label:"Priorité",text:"Classe ces tâches par ordre de priorité et urgence :"}, {id:"categoriser",label:"Catégories",text:"Range ces tâches dans des catégories logiques :"}];
prompts.forEach(p=>{const btn=document.createElement("button"); btn.textContent=p.label; btn.addEventListener("click",()=>{const combined=p.text+"\n\n"+tasks.map(t=>{let str="- "+t.text; if(t.comments?.length) str+="\n  Commentaires:\n"+t.comments.map(c=>`    - [${formatDate(c.date)}] ${c.text}`).join("\n"); return str;}).join("\n"); navigator.clipboard.writeText(combined).then(()=>{copiedMsg.style.display="block"; setTimeout(()=>copiedMsg.style.display="none",2000); window.open(llmSelect.value,"_blank");});}); promptsContainer.appendChild(btn);});

renderTasks();

// --- Push JSON vers modules Stack 2 ---
pushToModulesBtn.addEventListener("click",()=>{
  let raw=jsonPaste.value.trim();
  if(raw.startsWith("```")) raw=raw.replace(/^```[\w]*|```$/g,"").trim();
  let data;
  try{data=JSON.parse(raw);}catch{alert("JSON invalide"); return;}
  createModulesFromJSON(data);
});

// --- STACK 2 Modules ---
const modulePrompts=[{id:"mailPrompt",label:"Mail/Message",text:"Prépare le mail/message suivant :"}, {id:"livrablePrompt",label:"Livrable",text:"Prépare le livrable suivant :"}];

function createModulesFromJSON(json){
  modulesContainer.innerHTML="";
  // Jalons
  if(json.jalons?.length){const div=document.createElement("div"); div.className="module-header"; div.textContent="Jalons & Sous-actions"; modulesContainer.appendChild(div); json.jalons.forEach(j=>{const li=document.createElement("div"); li.className="module-item"; const cb=document.createElement("input"); cb.type="checkbox"; li.appendChild(cb); li.appendChild(document.createTextNode(" "+j.titre)); modulesContainer.appendChild(li);});}
  // Mails / Messages
  if(json.messages?.length){
    const div=document.createElement("div"); div.className="module-header"; div.textContent="Mails / Messages"; modulesContainer.appendChild(div);
    json.messages.forEach((m,index)=>{const li=document.createElement("div"); li.className="module-item"; const cb=document.createElement("input"); cb.type="checkbox"; li.appendChild(cb); li.appendChild(document.createTextNode(" "+m.sujet+" → "+m.destinataire)); const note=document.createElement("textarea"); note.className="note"; note.placeholder="Ajouter note…"; li.appendChild(note); modulesContainer.appendChild(li);});
    const btnDiv=document.createElement("div"); btnDiv.style.marginTop="5px"; const promptSelect=document.createElement("select"); modulePrompts.filter(p=>p.id==="mailPrompt").forEach(p=>{const opt=document.createElement("option"); opt.value=p.text; opt.textContent=p.label; promptSelect.appendChild(opt);}); const sendBtn=document.createElement("button"); sendBtn.textContent="Push au LLM"; sendBtn.addEventListener("click",()=>{const selected=Array.from(modulesContainer.querySelectorAll(".module-item input[type=checkbox]:checked")).map(cb=>{const note=cb.parentElement.querySelector("textarea")?.value.trim(); const txt=cb.parentElement.textContent.trim(); return note? txt+"\nNote: "+note : txt;}); if(selected.length===0){alert("Coche au moins une entrée !"); return;} const combined=promptSelect.value+"\n\n"+selected.join("\n\n"); navigator.clipboard.writeText(combined).then(()=>window.open(llmSelect.value,"_blank"));}); btnDiv.appendChild(promptSelect); btnDiv.appendChild(sendBtn); modulesContainer.appendChild(btnDiv);
  }
  // Livrables
  if(json.livrables?.length){
    const div=document.createElement("div"); div.className="module-header"; div.textContent="Livrables"; modulesContainer.appendChild(div);
    json.livrables.forEach(l=>{const li=document.createElement("div"); li.className="module-item"; const cb=document.createElement("input"); cb.type="checkbox"; li.appendChild(cb); li.appendChild(document.createTextNode(" "+l.titre+" ("+l.type+")")); const note=document.createElement("textarea"); note.className="note"; note.placeholder="Ajouter note…"; li.appendChild(note); modulesContainer.appendChild(li);});
    const btnDiv=document.createElement("div"); btnDiv.style.marginTop="5px"; const promptSelect=document.createElement("select"); modulePrompts.filter(p=>p.id==="livrablePrompt").forEach(p=>{const opt=document.createElement("option"); opt.value=p.text; opt.textContent=p.label; promptSelect.appendChild(opt);}); const sendBtn=document.createElement("button"); sendBtn.textContent="Push au LLM"; sendBtn.addEventListener("click",()=>{const selected=Array.from(modulesContainer.querySelectorAll(".module-item input[type=checkbox]:checked")).map(cb=>{const note=cb.parentElement.querySelector("textarea")?.value.trim(); const txt=cb.parentElement.textContent.trim(); return note? txt+"\nNote: "+note : txt;}); if(selected.length===0){alert("Coche au moins une entrée !"); return;} const combined=promptSelect.value+"\n\n"+selected.join("\n\n"); navigator.clipboard.writeText(combined).then(()=>window.open(llmSelect.value,"_blank"));}); btnDiv.appendChild(promptSelect); btnDiv.appendChild(sendBtn); modulesContainer.appendChild(btnDiv);
  }
}
