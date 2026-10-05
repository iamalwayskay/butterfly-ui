import { useEffect, useRef, useState } from "react"
import { ArrowRight, Check, Menu, X } from "lucide-react"
import { ButterflyMark } from "@/components/app-shell"
import { Button } from "@/design-system/components"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { appUrl } from "@/lib/app-location"
import "@/pages/lander.css"

const firstDrop = "/brand/kindred-campaign-hands.png"
const campaign = "/brand/kindred-campaign-diptych.png"

export function Lander() {
  const [navigationOpen, setNavigationOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const firstNavigationLink = useRef<HTMLAnchorElement>(null)
  const focusAfterNavigation = useRef<string | null>(null)
  const loginUrl = appUrl("/login")
  const sampleUrl = appUrl("/add?tab=meta")
  const uploadUrl = appUrl("/add?tab=upload")
  const reviewUrl = appUrl("/ads/1277290320948697?panel=jev&fixture-count=3")
  const transcriptUrl = appUrl("/ads/1277290320948697?panel=jev&view=transcript&fixture-count=3")

  useEffect(() => {
    if (navigationOpen) firstNavigationLink.current?.focus()
  }, [navigationOpen])

  const followMobileAnchor = (headingId: string) => {
    focusAfterNavigation.current = headingId
    setNavigationOpen(false)
  }

  return <div className="butterfly-landing">
    <a className="landing-skip" href="#main-content">Skip to content</a>
    <div className="landing-intro">
      <header className="landing-header">
        <a href="/" className="landing-logo" aria-label="Butterfly home"><ButterflyMark /><span>butterfly</span></a>
        <nav className="landing-desktop-navigation" aria-label="Main navigation">
          <a href="#workspace">Product</a><a href="#how-it-works">How It Works</a><a href="#features">Features</a><a href="#trust">Your Data</a>
        </nav>
        <Button asChild variant="quiet" className="landing-desktop-sign-in"><a href={loginUrl}>Sign In</a></Button>
        <Sheet open={navigationOpen} onOpenChange={setNavigationOpen}>
          <SheetTrigger asChild><button ref={menuButton} className="landing-menu-toggle" type="button" aria-label="Open navigation" aria-controls="landing-navigation"><Menu aria-hidden="true" /></button></SheetTrigger>
          <SheetContent id="landing-navigation" className="landing-mobile-navigation" aria-modal="true" showCloseButton={false} onOpenAutoFocus={event=>{event.preventDefault();firstNavigationLink.current?.focus()}} onCloseAutoFocus={event=>{event.preventDefault();const destination=focusAfterNavigation.current;focusAfterNavigation.current=null;if(destination){const focus=()=>document.getElementById(destination)?.focus();focus();window.setTimeout(focus,0)}else menuButton.current?.focus()}}>
            <SheetTitle className="sr-only">Main Navigation</SheetTitle><SheetDescription className="sr-only">Navigate the Butterfly product overview.</SheetDescription>
            <div className="landing-mobile-navigation-heading"><a href="/" className="landing-logo" aria-label="Butterfly home"><ButterflyMark /><span>butterfly</span></a><SheetClose asChild><button className="landing-navigation-close" type="button" aria-label="Close navigation"><X aria-hidden="true" /></button></SheetClose></div>
            <nav aria-label="Main navigation"><a ref={firstNavigationLink} href="#workspace" onClick={()=>followMobileAnchor("landing-title")}>Product</a><a href="#how-it-works" onClick={()=>followMobileAnchor("workflow-title")}>How It Works</a><a href="#features" onClick={()=>followMobileAnchor("features-title")}>Features</a><a href="#trust" onClick={()=>followMobileAnchor("trust-title")}>Your Data</a><Button asChild variant="primary" className="landing-mobile-sign-in"><a href={loginUrl}>Sign In</a></Button></nav>
          </SheetContent>
        </Sheet>
      </header>
    </div>

    <main id="main-content" tabIndex={-1}>
      <section className="landing-hero" id="workspace" aria-labelledby="landing-title">
        <div className="landing-geometry" aria-hidden="true"><i /><i /><i /></div>
        <div className="landing-hero-copy">
          <span className="landing-eyebrow">Creative Intelligence for Your Own Ads</span>
          <h1 id="landing-title" tabIndex={-1}><span>Your Ads.</span><span>A Closer Look.</span><span>A Clearer Next Move.</span></h1>
          <p>Bring every Meta creative into one workspace. Inspect the evidence, decide what changes, and prepare the next batch without losing the source.</p>
          <div className="landing-actions"><Button asChild variant="primary" trailingIcon={<ArrowRight />}><a href={sampleUrl}>Explore Sample Account</a></Button><Button asChild variant="secondary"><a href={loginUrl}>Sign In</a></Button></div>
          <p className="landing-caption"><Check aria-hidden="true" /> Kindred sample workspace. No Meta connection required.</p>
        </div>

        <figure className="landing-preview" aria-labelledby="preview-caption">
          <figcaption id="preview-caption" className="landing-preview-heading"><span><ButterflyMark /> Creative Review</span><span>Kindred · Sample</span></figcaption>
          <div className="landing-preview-body">
            <a className="landing-preview-creative" href={reviewUrl} aria-label="Explore First Drop creative review"><img src={firstDrop} width="941" height="1672" alt="Kindred serum held above an open hand, shown uncropped" fetchPriority="high" /><span><strong>First Drop — Cut 03</strong><small>Instagram Reels · Paused</small></span></a>
            <div className="landing-preview-read"><div className="landing-preview-status"><span>Analysis Complete</span><span className="landing-data">Property Set</span></div><h2>First Frame, Fully Accounted For.</h2><dl><div><dt>Opening</dt><dd>First Product Appearance</dd><dd className="landing-data">0:00</dd></div><div><dt>Evidence</dt><dd>Dropper and bottle are visible from the first frame.</dd></div><div><dt>Confidence</dt><dd className="landing-data">97%</dd></div></dl><a href={reviewUrl} className="landing-inline-link">Explore the Review <ArrowRight aria-hidden="true" /></a></div>
          </div>
        </figure>
      </section>

      <section className="landing-loop" id="how-it-works" aria-labelledby="workflow-title">
        <div className="landing-section-heading"><span>One Connected Workflow</span><h2 id="workflow-title" tabIndex={-1}>From Creative to the Next Test.</h2></div>
        <ol><li><span className="landing-data">01</span><strong>Bring In Ads</strong><small>Connect the sample account or upload your own creative.</small></li><li><span className="landing-data">02</span><strong>Review the Read</strong><small>Inspect properties, evidence, transcript and timing.</small></li><li><span className="landing-data">03</span><strong>Decide What Changes</strong><small>Confirm a finding, write a note or shape a new variant.</small></li><li><span className="landing-data">04</span><strong>Build the Batch</strong><small>Preview placements and rehearse a paused Meta handoff.</small></li></ol>
      </section>

      <section className="landing-proof landing-section" aria-labelledby="proof-title">
        <div className="landing-proof-copy"><span className="landing-kicker">Review What the Creative Actually Does</span><h2 id="proof-title">Creative, Findings and Evidence Stay Together.</h2><p>Open an ad once. Move from the full creative to grouped JEV properties, shot time ranges, timed evidence and the complete transcript without losing context.</p><ul><li>Opening, story and CTA findings on one narrative timeline</li><li>Observed values, confidence and source evidence</li><li>Confirm, correct or turn a finding into the next ad</li></ul><div className="landing-entry-actions"><Button asChild variant="secondary"><a href={uploadUrl}>Upload Creative</a></Button><a className="landing-inline-link" href={reviewUrl}>Open JEV Review <ArrowRight aria-hidden="true" /></a></div></div>
        <div className="landing-review-proof" aria-label="JEV review and transcript preview"><div className="landing-review-proof__head"><span>JEV Review</span><span className="landing-data">Complete · Sample</span></div><div className="landing-review-proof__body"><img src={firstDrop} width="941" height="1672" loading="lazy" alt="First Drop creative shown in full portrait ratio" /><div className="landing-property-list"><a href={reviewUrl}><span>Opening</span><strong>First Product Appearance</strong><small className="landing-data">0:00 · 97%</small></a><a href={reviewUrl}><span>Hook Type</span><strong>Dropper Demonstration</strong><small className="landing-data">91%</small></a><a href={reviewUrl}><span>Primary Angle</span><strong>Daily Ritual</strong><small className="landing-data">88%</small></a><a className="landing-transcript-link" href={transcriptUrl}><span>Transcript &amp; Timeline</span><strong>Shots, words and evidence in context</strong><ArrowRight aria-hidden="true" /></a></div></div></div>
      </section>

      <section className="landing-capabilities landing-section" id="features" aria-labelledby="features-title">
        <div className="landing-section-heading"><span>More Than a Review Screen</span><h2 id="features-title" tabIndex={-1}>A Workspace Built Around the Next Move.</h2></div>
        <div className="landing-capability-grid">
          <a className="landing-capability landing-capability--library" href={appUrl("/ads?view=all&fixture-count=3")}><span>Creative Library</span><h3>Scan the work, not a wall of metadata.</h3><p>Filter, group, compare and switch the metric that matters while every asset keeps its real ratio.</p><span className="landing-card-action">Open Library <ArrowRight aria-hidden="true" /></span><div className="landing-library-strip" aria-hidden="true"><img src="/brand/kindred-campaign-evening.png" alt="" /><img src="/brand/kindred-campaign-serum.png" alt="" /><img src={firstDrop} alt="" /></div></a>
          <a className="landing-capability landing-capability--properties" href={appUrl("/settings?tab=analysis-properties")}><span>Analysis Properties</span><h3>Shape what the review looks for.</h3><p>Search, enable, reorder and add local property definitions without rewriting past findings.</p><ul aria-label="Example property groups"><li><span>Opening</span><small>Hook and first frame</small></li><li><span>Story &amp; Structure</span><small>Sequence and pacing</small></li><li><span>Offer &amp; Action</span><small>Claim and next step</small></li></ul><span className="landing-card-action">Manage Properties <ArrowRight aria-hidden="true" /></span></a>
          <a className="landing-capability landing-capability--create" href={appUrl("/create?step=copy")}><div><span>Create Ads</span><h3>Build the next batch with the source attached.</h3><p>Write copy, preview Feed, Reels and Stories, map Meta setup and record the paused handoff.</p><span className="landing-card-action">Open Batch Builder <ArrowRight aria-hidden="true" /></span></div><img src={campaign} width="1330" height="1182" loading="lazy" alt="Kindred campaign assets used in the sample creation batch" /></a>
          <div className="landing-capability landing-capability--workflow"><span>Plan and Follow Through</span><h3>Keep the decision visible.</h3><p>Coordinate team roles and local invitations. No email is sent by the demo.</p><nav aria-label="Planning and workflow previews"><a href={appUrl("/canvas")}>Creative Canvas <ArrowRight aria-hidden="true" /></a><a href={appUrl("/work?view=drafts")}>Work Queue <ArrowRight aria-hidden="true" /></a><a href={appUrl("/team")}>Team Roles <ArrowRight aria-hidden="true" /></a></nav></div>
        </div>
      </section>

      <section className="landing-trust landing-section" id="trust" aria-labelledby="trust-title"><div><span className="landing-kicker">Your Data</span><h2 id="trust-title" tabIndex={-1}>A Truthful Demo, Ready for the Real Services.</h2></div><div className="landing-trust-copy"><p>Kindred creative, delivery figures and JEV findings are sample data. Your uploads remain visually and structurally distinct from that sample analysis.</p><p>This preview saves workspace changes in your browser. It does not contact Meta, run a live model, send invitations or publish ads.</p></div></section>

      <section className="landing-close landing-section" aria-labelledby="close-title"><div className="landing-close-geometry" aria-hidden="true"><ButterflyMark /><span /></div><div><span className="landing-kicker">Start With the Work You Already Have</span><h2 id="close-title">One Ad. One Clear Read. One Better Next Move.</h2></div><Button asChild variant="primary" trailingIcon={<ArrowRight />}><a href={sampleUrl}>Explore Sample Account</a></Button></section>
    </main>
    <footer className="landing-footer"><a href="/" className="landing-logo"><ButterflyMark /><span>butterfly</span></a><p>Your creative. Your judgment.</p><a href={loginUrl}>Sign In</a></footer>
  </div>
}
