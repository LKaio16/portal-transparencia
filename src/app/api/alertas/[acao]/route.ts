import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE_SESSAO,
  buscarParlamentar,
  confirmar,
  deixarDeSeguir,
  dentroDoLimite,
  emailValido,
  excluirConta,
  hashIp,
  normalizarEmail,
  pedirAcesso,
  pedirInscricao,
  sairPorLink,
} from "@/servidor/alertas";

export const dynamic = "force-dynamic";

const UM_DIA_MIN = 24 * 60;
const SEIS_MESES_S = 180 * 24 * 60 * 60;

const ipDe = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
const campo = (dados: FormData, nome: string) => String(dados.get(nome) ?? "").trim();
const ir = (req: NextRequest, caminho: string) => NextResponse.redirect(new URL(caminho, req.url), 303);
const json = (ok: boolean, mensagem: string, status = 200) => NextResponse.json({ ok, mensagem }, { status });

export async function POST(req: NextRequest, ctx: { params: Promise<{ acao: string }> }) {
  const { acao } = await ctx.params;
  try {
    return await executar(req, acao);
  } catch (erro) {
    console.error(`Erro em /api/alertas/${acao}:`, erro);
    if (acao === "inscrever") return json(false, "Não foi possível concluir agora. Tente de novo em instantes.", 500);
    return ir(req, "/alertas/conta?msg=erro");
  }
}

async function executar(req: NextRequest, acao: string) {
  const dados = await req.formData().catch(() => new FormData());
  const sessao = req.cookies.get(COOKIE_SESSAO)?.value;

  switch (acao) {
    // Formulário "Receber alertas" na ficha (enviado por fetch, responde JSON).
    case "inscrever": {
      if (campo(dados, "site")) return json(true, "Pronto! Confira seu e-mail."); // campo-isca para robôs
      const email = normalizarEmail(campo(dados, "email"));
      const parlamentar = campo(dados, "parlamentar");
      if (!emailValido(email)) return json(false, "Digite um e-mail válido.", 400);
      if (campo(dados, "consentimento") !== "sim") return json(false, "Marque a caixa de concordância para continuar.", 400);
      if (!buscarParlamentar(parlamentar)) return json(false, "Parlamentar não encontrado.", 400);
      const ip = hashIp(ipDe(req));
      if (!(await dentroDoLimite(`ip:${ip}`, 10, 60)) || !(await dentroDoLimite(`email:${email}`, 5, UM_DIA_MIN))) {
        return json(false, "Muitas tentativas. Tente de novo mais tarde.", 429);
      }
      await pedirInscricao(email, parlamentar);
      return json(true, "Pronto! Enviamos um e-mail de confirmação. Clique no link para começar a receber os alertas.");
    }

    // Formulário "Receber link de acesso" na página da conta.
    case "acesso": {
      const email = normalizarEmail(campo(dados, "email"));
      if (!emailValido(email)) return ir(req, "/alertas/conta?msg=email-invalido");
      const ip = hashIp(ipDe(req));
      if ((await dentroDoLimite(`ip:${ip}`, 10, 60)) && (await dentroDoLimite(`email:${email}`, 5, UM_DIA_MIN))) {
        await pedirAcesso(email);
      }
      return ir(req, "/alertas/conta?msg=link-enviado");
    }

    // Botão "Confirmar" da página aberta pelo link do e-mail.
    case "confirmar": {
      const resultado = await confirmar(campo(dados, "t"));
      if (!resultado) return ir(req, "/alertas/conta?msg=link-expirado");
      const resposta = ir(req, `/alertas/conta?msg=${resultado.adicionado ? `seguindo&p=${resultado.adicionado.chave}` : "entrou"}`);
      resposta.cookies.set(COOKIE_SESSAO, resultado.tokenAcesso, {
        httpOnly: true,
        sameSite: "lax",
        secure: req.nextUrl.protocol === "https:",
        path: "/",
        maxAge: SEIS_MESES_S,
      });
      return resposta;
    }

    case "deixar": {
      await deixarDeSeguir(sessao, campo(dados, "parlamentar"));
      return ir(req, "/alertas/conta?msg=removido");
    }

    case "excluir": {
      await excluirConta(sessao);
      const resposta = ir(req, "/alertas/conta?msg=excluido");
      resposta.cookies.delete(COOKIE_SESSAO);
      return resposta;
    }

    case "sair-dispositivo": {
      const resposta = ir(req, "/alertas/conta");
      resposta.cookies.delete(COOKIE_SESSAO);
      return resposta;
    }

    // Link do rodapé dos e-mails. Também atende o descadastro com um clique do Gmail/Outlook (RFC 8058),
    // que manda os parâmetros na URL.
    case "sair": {
      const id = campo(dados, "i") || req.nextUrl.searchParams.get("i") || "";
      const t = campo(dados, "t") || req.nextUrl.searchParams.get("t") || "";
      const ok = await sairPorLink(id, t);
      return ir(req, `/alertas/sair?feito=${ok ? "1" : "0"}`);
    }

    default:
      return json(false, "Ação desconhecida.", 404);
  }
}
