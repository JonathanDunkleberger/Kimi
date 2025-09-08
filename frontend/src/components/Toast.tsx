import React, { useEffect, useState } from "react";

export default function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(()=>{
    if (!msg) return;
    const id = setTimeout(()=>setMsg(null), 2200);
    return ()=>clearTimeout(id);
  }, [msg]);
  function toast(m: string) { setMsg(m); }
  const node = msg ? <div className="toast">{msg}</div> : null;
  return { toast, node };
}