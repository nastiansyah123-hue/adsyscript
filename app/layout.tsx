import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'adsyscript',description:'Studio naskah AI: tema, kategori, dan lima cerita baru setiap hari.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="id"><body>{children}</body></html>}
