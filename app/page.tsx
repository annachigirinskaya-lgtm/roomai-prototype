import Link from 'next/link';
export default function Home(){return <main style={{maxWidth:1120,margin:'0 auto',padding:'12px'}}>
<section style={{position:'relative',height:'min(76svh,760px)',minHeight:510,overflow:'hidden',borderRadius:26,background:'#3d3026'}}>
{/* The supplied artwork has baked-in headings and buttons at both ends.
    Show only the unlettered central interior until a clean hero asset is available. */}
<div style={{position:'absolute',inset:0,backgroundImage:"linear-gradient(180deg,rgba(22,17,14,.76) 0%,transparent 33%,transparent 67%,rgba(22,17,14,.87) 100%),url('/roomai-hero.png')",backgroundSize:'100% 100%,auto 245%',backgroundPosition:'center,center 42%',backgroundRepeat:'no-repeat'}}/>
<div style={{position:'absolute',top:28,left:12,right:12,textAlign:'center',color:'white',textShadow:'0 2px 12px #0009'}}><h1 style={{fontSize:'clamp(32px,7vw,60px)',letterSpacing:'.17em',fontWeight:500}}>AI DESIGN</h1><p style={{letterSpacing:'.16em',fontSize:'clamp(11px,2.5vw,16px)',marginTop:6}}>ONE ROOM. UP TO SIX STYLES.</p></div>
<Link href="/new-project" style={{position:'absolute',bottom:26,left:'8%',width:'84%',padding:'17px 10px',boxSizing:'border-box',borderRadius:50,background:'white',color:'#17120f',fontSize:18,fontWeight:700,textAlign:'center',textDecoration:'none',boxShadow:'0 5px 24px #0005'}}>Start designing ✨</Link>
</section></main>}