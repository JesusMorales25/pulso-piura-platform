"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, CurrencyDollar, MapPin, ShieldCheck, Star, UserCircle, UsersThree } from "@phosphor-icons/react";
import type { MatchParticipation, MatchSummary } from "@/features/matches/types";
import styles from "./FeaturedMatchCardV2.module.css";

export function FeaturedMatchCardV2({match,busy,participation,onJoin}:{match:MatchSummary;busy:boolean;participation:MatchParticipation|null;onJoin:()=>void}){
 const date=new Date(match.startsAt); const occupation=Math.min(100,(match.occupiedPlayers/match.maxPlayers)*100);
 const price=new Intl.NumberFormat("es-PE",{style:"currency",currency:match.currency,maximumFractionDigits:match.priceMinor%100?2:0}).format(match.priceMinor/100);
 const weekday=date.toLocaleDateString("es-PE",{weekday:"long",timeZone:"America/Lima"}); const month=date.toLocaleDateString("es-PE",{month:"short",timeZone:"America/Lima"}).replace(".","");
 const image=match.sportCode==="VOLLEYBALL"?"/images/hero-match-volleyball-night.png":"/images/hero-match-football-mixed-night.png";
 return <article className={styles.card} aria-labelledby="featured-match-title"><Image className={styles.photo} src={image} alt="" fill sizes="(max-width:760px) 100vw,720px"/><div className={styles.content}>
  <aside className={styles.dateRail}><span>{weekday}</span><strong>{date.toLocaleDateString("es-PE",{day:"2-digit",timeZone:"America/Lima"})}</strong><b>{month} {date.getFullYear()}</b><i/><p><Clock size={20}/>{date.toLocaleTimeString("es-PE",{hour:"numeric",minute:"2-digit",timeZone:"America/Lima"})}</p></aside>
  <div className={styles.main}><p className={styles.label}>PARTIDO DESTACADO <Star size={14} weight="fill"/></p><h2 id="featured-match-title">{match.title}</h2>
   <p className={styles.location}><MapPin size={17} weight="fill"/><b>{match.venueAddress}</b> · {match.venueName}</p><p className={styles.level}>Nivel {match.skillLevel.toLocaleLowerCase("es-PE")}</p>
   <div className={styles.facts}><div><CurrencyDollar/><span><small>PRECIO</small><strong>{price}</strong></span></div><div><UsersThree/><span><small>{match.availablePlayers} CUPOS DISPONIBLES</small><strong>{match.availablePlayers} <i>/ {match.maxPlayers}</i></strong></span></div></div>
   <div className={styles.occupancy}><span>OCUPACIÓN DEL PARTIDO <b>{match.occupiedPlayers} de {match.maxPlayers} jugadores</b></span><div><i style={{width:`${occupation}%`}}/></div><p>{(match.participantPreview??[]).map((player,index)=><span aria-label={player.displayName} className={styles.playerAvatar} key={`${player.displayName}-${index}`} style={player.avatarUrl?{backgroundImage:`url(${player.avatarUrl})`}:undefined}>{!player.avatarUrl&&player.displayName.slice(0,1).toUpperCase()}</span>)}{Array.from({length:Math.max(0,Math.min(match.occupiedPlayers,7)-(match.participantPreview??[]).length)},(_,index)=><UserCircle key={`private-${index}`} size={25} weight="fill"/>)}{Array.from({length:Math.min(match.availablePlayers,4)},(_,index)=><UserCircle className={styles.emptyAvatar} key={`e-${index}`} size={25}/>)}</p></div>
   <div className={styles.organizer}><UserCircle size={43}/><span><b>Organiza el partido</b><small><ShieldCheck size={14} weight="fill"/> Organizador verificado</small></span></div><p className={styles.payment}><ShieldCheck size={16}/> Pago seguro con <b>Yape</b> o <b>Plin</b></p>
   <div className={styles.actions}>{participation?<p className={styles.result}>{participation.status==="JOINED"?"Ya estás inscrito":`Lista de espera · ${participation.waitlistPosition}`}</p>:<button type="button" onClick={onJoin} disabled={busy}><UsersThree size={23}/>{match.availablePlayers>0?"Unirme al partido":"Entrar a lista de espera"}<ArrowRight size={22}/></button>}<Link href={`/partidos/${match.publicSlug}`}>Ver detalles</Link></div>
  </div>{match.publicSlug.endsWith("-demo")&&<small className={styles.demo}>Partido de demostración · sin cobros reales</small>}
 </div></article>;
}
