import Link from 'next/link';
export default function Home(){return <main style={{margin:0,padding:0,width:'100%'}}>
<section aria-label="AI Design — design your room" style={{position:'relative',width:'100%',height:'calc(100svh - 64px)',minHeight:560,overflow:'hidden',background:'#71513b'}}>
{/* Approved hero art contains all its own typography and CTA; crop only its mock navigation. */}
<div style={{position:'absolute',inset:0,backgroundImage:"url('/42B16CDE-84C4-45F8-895D-49AE836647E7.png')",backgroundSize:'cover',backgroundPosition:'center 58%',backgroundRepeat:'no-repeat'}}/>
<Link href="/new-project" aria-label="Start designing — upload your room photo" style={{position:'absolute',bottom:'5%',left:'15%',width:'70%',height:'10%',display:'block',borderRadius:999}}><span className="sr-only">Start designing</span></Link>
</section></main>}