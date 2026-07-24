import React from "react";
import { User } from "lucide-react";

interface AvatarCustomProps {
  src?: string | null;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  isTeam?: boolean;
}

export function AvatarCustom({ src, name, size = "md", className = "", isTeam = false }: AvatarCustomProps) {
  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-xl",
    xl: "w-24 h-24 text-3xl",
  };

  const iconSizes = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 32,
    xl: 48,
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  const getRandomColor = (name: string) => {
    const colors = [
      "bg-blue-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-cyan-500",
      "bg-emerald-500",
      "bg-amber-500",
      "bg-rose-500",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (src && src.trim() !== "") {
    return (
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden border border-white/15 bg-zinc-900 ring-1 ring-primary/10 shadow-[0_0_18px_-10px_rgb(34_211_238_/_0.8)] flex-shrink-0 ${className}`}>
        <img 
          src={src} 
          alt={name} 
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement!;
            parent.classList.add(getRandomColor(name));
            parent.classList.add("flex", "items-center", "justify-center");
            parent.innerHTML = `<span class="font-bold text-white">${getInitials(name)}</span>`;
          }}
        />
      </div>
    );
  }

  // Default anonymous icon for teams or users without logo
  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center border border-white/15 bg-zinc-800/90 text-white ring-1 ring-primary/10 shadow-[0_0_18px_-10px_rgb(34_211_238_/_0.55)] flex-shrink-0 ${className}`}>
      {isTeam ? (
        <User size={iconSizes[size]} className="text-slate-400" />
      ) : (
        <span className="font-bold text-white">{getInitials(name)}</span>
      )}
    </div>
  );
}
