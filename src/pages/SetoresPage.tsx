import { useEffect, useMemo, useState } from "react"
import { Plus, Trash2, Search } from "lucide-react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import type { Setor } from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"

export function SetoresPage() {
  const [setores, setSetores] = useState<Setor[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nome, setNome] = useState("")
  const [predio, setPredio] = useState("")
  const [andar, setAndar] = useState("")
  const [busca, setBusca] = useState("")

  const setoresFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return setores
    return setores.filter((s) =>
      [s.nome, s.predio, s.andar].some((campo) => campo?.toLowerCase().includes(termo))
    )
  }, [setores, busca])

  async function fetchSetores() {
    setLoading(true)
    const { data, error } = await supabase.from("setores").select("*").order("nome")
    if (error) {
      toast.error("Erro ao carregar setores: " + error.message)
    } else {
      setSetores(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSetores()
  }, [])

  async function handleSubmit() {
    if (!nome.trim()) {
      toast.error("Informe o nome do setor")
      return
    }
    setSaving(true)
    const { error } = await supabase.from("setores").insert({
      nome: nome.trim(),
      predio: predio.trim() || null,
      andar: andar.trim() || null,
    })
    if (error) {
      toast.error("Erro ao salvar: " + error.message)
    } else {
      toast.success("Setor criado")
      setNome("")
      setPredio("")
      setAndar("")
      setOpen(false)
      fetchSetores()
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("setores").delete().eq("id", id)
    if (error) {
      toast.error("Erro ao excluir: " + error.message)
    } else {
      toast.success("Setor removido")
      fetchSetores()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Setores</h2>
          <p className="text-sm text-muted-foreground">
            Locais do hospital (UTI, Pronto Socorro, Farmacia...)
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              Novo setor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo setor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="predio">Predio</Label>
                <Input id="predio" value={predio} onChange={(e) => setPredio(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="andar">Andar</Label>
                <Input id="andar" value={andar} onChange={(e) => setAndar(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar por nome, predio ou andar..."
          className="pl-8"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Predio</TableHead>
            <TableHead>Andar</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Carregando...
              </TableCell>
            </TableRow>
          )}
          {!loading && setoresFiltrados.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                {setores.length === 0 ? "Nenhum setor cadastrado" : "Nenhum resultado encontrado"}
              </TableCell>
            </TableRow>
          )}
          {setoresFiltrados.map((setor) => (
            <TableRow key={setor.id}>
              <TableCell className="font-medium">{setor.nome}</TableCell>
              <TableCell>{setor.predio ?? "-"}</TableCell>
              <TableCell>{setor.andar ?? "-"}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(setor.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
