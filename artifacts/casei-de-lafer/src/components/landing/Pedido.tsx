import { WHATSAPP_HREF } from "@/lib/landing/links";
import { BOTAO } from "@/lib/landing/textos";

interface Props {
  /** Diferencia os campos quando há mais de um formulário na página ("topo", "final"). */
  id: string;
  rotuloData: string;
  escolher: string;
  nota: string;
  /** Campo de cidade, só no formulário do fim da página. */
  local?: { rotulo: string; exemplo: string };
}

// Pedido de data. É um formulário comum que vai para /whatsapp: funciona sem JavaScript.
// A data é opcional: "required" serve só para o navegador saber quando o campo está vazio (e mostrar
// "Escolher a data"), e o botão dispensa a conferência (formNoValidate) para poder seguir sem data.
export default function Pedido({ id, rotuloData, escolher, nota, local }: Props) {
  return (
    <form className="pedido" action={WHATSAPP_HREF} method="get" data-pedido>
      <label className="campo" htmlFor={`data-${id}`}>
        <span className="mono">{rotuloData}</span>
        <span className="caixa">
          <input type="date" id={`data-${id}`} name="data" required />
          <span className="vazio" aria-hidden="true">
            {escolher}
          </span>
        </span>
      </label>
      {local && (
        <label className="campo" htmlFor={`local-${id}`}>
          <span className="mono">{local.rotulo}</span>
          <span className="caixa">
            <input type="text" id={`local-${id}`} name="local" placeholder={local.exemplo} maxLength={80} autoComplete="off" enterKeyHint="go" />
          </span>
        </label>
      )}
      <button className="botao" type="submit" formNoValidate>
        {BOTAO}{" "}
        <span className="seta" aria-hidden="true">
          →
        </span>
      </button>
      <p className="escolhida" data-escolhida aria-live="polite" />
      <p className="nota">{nota}</p>
    </form>
  );
}
