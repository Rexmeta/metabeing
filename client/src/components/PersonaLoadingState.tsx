import { Loader2, MessageCircle, User } from "lucide-react";

interface PersonaLoadingStateProps {
  profileImage?: string | null;
  personaName?: string;
  mbtiDisplay?: string;
  loadingMessage?: string;
}

export default function PersonaLoadingState({
  profileImage,
  personaName = "페르소나",
  mbtiDisplay,
  loadingMessage = "대화 준비 중..."
}: PersonaLoadingStateProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 transition-all duration-300">
      <div className="flex flex-col items-center gap-6 animate-in fade-in-0 duration-500">
        <div className="relative">
          {profileImage ? (
            <div className="relative">
              <img 
                src={profileImage} 
                alt={personaName}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-primary/20 shadow-lg"
              />
              <div className="absolute inset-0 rounded-full border-4 border-primary/40 animate-pulse" />
            </div>
          ) : (
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center border-4 border-primary/20 shadow-lg">
              <User className="w-10 h-10 sm:w-14 sm:h-14 text-primary/60" />
            </div>
          )}
          <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-2 shadow-md">
            <MessageCircle className="w-4 h-4" />
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            {personaName}
          </h2>
          {mbtiDisplay && (
            <span className="inline-block px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
              {mbtiDisplay}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm">{loadingMessage}</p>
        </div>
      </div>
    </div>
  );
}
