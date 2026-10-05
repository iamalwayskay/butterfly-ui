import { createRoot } from "react-dom/client"
import { useState } from "react"
import { Plus } from "lucide-react"
import { Button, IconButton, Combobox } from "../src/design-system/components"
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "../src/components/ui/dialog"
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription } from "../src/components/ui/sheet"
import "../src/index.css"

function Fixture() {
  const [value, setValue] = useState("")
  return <main style={{padding:24,minHeight:2200}}>
    <h1>Review your creative</h1><p>Understand what worked for your audience.</p>
    <span data-testid="brand" style={{fontFamily:"var(--font-brand)"}}>butterfly</span>
    <span data-testid="data" style={{font:"var(--type-data)"}}>00:12</span>
    <div><Button variant="primary">Create Batch</Button><Button variant="outline">Upload</Button><Button variant="quiet">Cancel</Button></div>
    <IconButton label="Add note" icon={Plus} />
    <IconButton label="Selected tool" icon={Plus} aria-pressed />
    <Button size="icon-xs" aria-label="Compact action"><Plus /></Button>
    <Button>Before account</Button>
    <Combobox label="Account" value={value} onValueChange={setValue} options={[{value:"kindred",label:"Kindred"},{value:"disabled",label:"Disabled",disabled:true},{value:"other",label:"Other account"}]} />
    <Button>After account</Button><output>{value}</output>
    <Dialog><DialogTrigger asChild><Button>Open dialog</Button></DialogTrigger><DialogContent><DialogTitle>Review dialog</DialogTitle><DialogDescription>Review the creative.</DialogDescription><div style={{height:1200}}>Long review</div></DialogContent></Dialog>
    <Sheet><SheetTrigger asChild><Button>Open sheet</Button></SheetTrigger><SheetContent><SheetTitle>Review sheet</SheetTitle><SheetDescription>Review the creative.</SheetDescription><div style={{minHeight:1200}}>Long review</div></SheetContent></Sheet>
  </main>
}
createRoot(document.getElementById("root")!).render(<Fixture />)
