const tones={idle:'bg-[#7d8ea0]',live:'bg-[#9aefc5]',busy:'bg-[#f3d18a]'};

export function Dot({tone='idle',glow}:{tone?:keyof typeof tones;glow?:boolean}){
 return <i className={`inline-block size-[7px] rounded-full ${tones[tone]} ${glow?'shadow-[0_0_0_4px_#9aefc522]':''}`}/>;
}
