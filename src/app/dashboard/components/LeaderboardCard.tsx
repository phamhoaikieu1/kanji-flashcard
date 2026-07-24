interface LeaderboardProps {
  leaderboardData: any[];
  totalSystemCards: number;
  onSelectProfile: (player: any) => void;
}

export function LeaderboardCard({ leaderboardData, totalSystemCards, onSelectProfile }: LeaderboardProps) {
  return (
    <div className="w-full bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col max-h-[300px] flex-shrink-0">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-50 flex-shrink-0">
        <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
          🏆 Bảng Xếp Hạng Từ Vựng
        </h3>
        <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
          Cập nhật Realtime
        </span>
      </div>

      <div className="space-y-2 overflow-y-auto pt-2 pr-1 flex-grow no-scrollbar">
        {leaderboardData.length === 0 ? (
          <p className="text-center text-[11px] font-bold text-slate-400 py-4">Chưa có ai học từ nào ở đây cả hết!</p>
        ) : (
          leaderboardData.map((player, index) => (
            <div 
              key={player.id} 
              onClick={() => onSelectProfile(player)}
              className={`flex items-center justify-between p-2.5 rounded-2xl border text-xs font-bold cursor-pointer active:scale-[0.98] transition-all hover:shadow-sm ${
                player.is_current 
                  ? 'bg-indigo-50/50 border-indigo-100 text-indigo-900' 
                  : 'bg-slate-50/50 border-slate-100 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <span className="text-slate-400 w-4 font-black">{index + 1}.</span>
                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-100">
                  {player.avatar_url ? (
                    <img src={player.avatar_url} alt="Ava" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold">{player.display_name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="truncate max-w-[130px]">{player.display_name}</span>
              </div>
              <div>
                <span className="text-indigo-600 flex items-center gap-0.5 font-mono text-[11px]">
                  💬 {player.total_words} {totalSystemCards > 0 ? `/ ${totalSystemCards}` : 'từ'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}