import Link from 'next/link';
export default function Home(){return <main style={{maxWidth:720,margin:'0 auto',padding:'12px'}}>
<section aria-label="AI Design — design your room" style={{position:'relative',width:'100%',aspectRatio:'0.72',overflow:'hidden',borderRadius:26,background:'#765640'}}>
{/* Artwork already contains the complete headline and illustrated button.
    Crop the screenshot-style top navigation from the uploaded artwork. */}
<div style={{position:'absolute',inset:0,backgroundImage:"url('/42B16CDE-84C4-45F8-895D-49AE836647E7.png')",backgroundSize:'100% auto',backgroundPosition:'center bottom',backgroundRepeat:'no-repeat'}}/>
<Link href="/new-project" aria-label="Start designing — upload your room" style={{position:'absolute',bottom:'4%',left:'17%',width:'66%',height:'12%',display:'block',borderRadius:999}}><span className="sr-only">Start designing</span></Link>
</section></main>}