"""
Entidades principais do sistema de gestão do DAER Nilopolitano.

Ver o plano de desenvolvimento para o desenho completo dessas entidades.
Eventos ficam como páginas do Wagtail (app `cms`, modelo `EventoPage`).
"""
import uuid
from functools import cached_property

from django.conf import settings
from django.db import models
from django.utils import timezone


class Igreja(models.Model):
    nome = models.CharField(max_length=200)

    # Endereço — sem campo de estado: todas as igrejas participantes ficam no Rio de Janeiro
    cep = models.CharField("CEP", max_length=9, blank=True)
    rua = models.CharField(max_length=200, blank=True)
    numero = models.CharField("Número", max_length=20, blank=True)
    complemento = models.CharField(max_length=100, blank=True)
    bairro = models.CharField(max_length=100, blank=True)
    municipio = models.CharField("Município", max_length=100, blank=True)

    # Derivadas do endereço, usadas para plotar no mapa (Leaflet/Mapbox)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    contato_nome = models.CharField("Nome do contato", max_length=150, blank=True)
    contato_telefone = models.CharField("Telefone do contato", max_length=20, blank=True)

    class Meta:
        verbose_name = "Igreja"
        verbose_name_plural = "Igrejas"
        ordering = ["nome"]

    def __str__(self):
        return self.nome


class DiaSemana(models.TextChoices):
    DOMINGO = "domingo", "Domingo"
    SEGUNDA = "segunda", "Segunda-feira"
    TERCA = "terca", "Terça-feira"
    QUARTA = "quarta", "Quarta-feira"
    QUINTA = "quinta", "Quinta-feira"
    SEXTA = "sexta", "Sexta-feira"
    SABADO = "sabado", "Sábado"


class Embaixada(models.Model):
    nome = models.CharField(max_length=200)
    igreja = models.OneToOneField(
        Igreja, on_delete=models.PROTECT, related_name="embaixada"
    )

    class Meta:
        verbose_name = "Embaixada"
        verbose_name_plural = "Embaixadas"
        ordering = ["nome"]

    def __str__(self):
        return self.nome


class HorarioReuniao(models.Model):
    """
    Uma embaixada pode ter mais de uma reunião por semana (ex.: reunião
    normal no sábado + culto infantil no domingo) — por isso é um model à
    parte com FK pra Embaixada, em vez de dois campos soltos nela.
    """

    embaixada = models.ForeignKey(
        Embaixada, on_delete=models.CASCADE, related_name="horarios_reuniao"
    )
    dia_semana = models.CharField("Dia da semana", max_length=10, choices=DiaSemana.choices)
    horario = models.TimeField("Horário")

    class Meta:
        verbose_name = "Horário de reunião"
        verbose_name_plural = "Horários de reunião"
        ordering = ["embaixada", "dia_semana", "horario"]

    def __str__(self):
        return f"{self.embaixada} — {self.get_dia_semana_display()} às {self.horario.strftime('%H:%M')}"


class TipoMembro(models.TextChoices):
    CONSELHEIRO = "conselheiro", "Conselheiro"
    AUXILIAR = "auxiliar", "Auxiliar"
    EMBAIXADOR_DO_REI = "embaixador_do_rei", "Embaixador do Rei"


class PostoEmbaixador(models.TextChoices):
    ESCUDEIRO = "escudeiro", "Embaixador Escudeiro"
    ARAUTO = "arauto", "Embaixador Arauto"
    SENIOR = "senior", "Embaixador Sênior"
    EMERITO = "emerito", "Embaixador Emérito"


class Membro(models.Model):
    nome = models.CharField(max_length=200)
    data_nascimento = models.DateField()
    foto = models.ImageField(upload_to="membros/fotos/", null=True, blank=True)
    telefone_contato = models.CharField(max_length=20, blank=True)
    email = models.EmailField(unique=True, null=True, blank=True)

    tipo = models.CharField(max_length=30, choices=TipoMembro.choices)

    # Só preenchido quando tipo = embaixador_do_rei. "Escudeiro" é o posto
    # inicial; sobe informalmente (~1 ano, mas varia) a critério do
    # conselheiro — não existe regra automática de progressão.
    posto_embaixador = models.CharField(
        "Posto",
        max_length=20,
        choices=PostoEmbaixador.choices,
        null=True,
        blank=True,
        help_text="Preencher apenas quando tipo = Embaixador do Rei.",
    )

    # Preenchidos apenas quando tipo = embaixador_do_rei
    nome_responsavel = models.CharField(
        "Nome do responsável", max_length=200, blank=True
    )
    telefone_responsavel = models.CharField(
        "Telefone do responsável", max_length=20, blank=True
    )

    embaixada = models.ForeignKey(
        Embaixada, on_delete=models.PROTECT, related_name="membros"
    )
    ativo = models.BooleanField(default=True)

    # Login do membro no sistema (todos os tipos podem ter conta). Fica nulo
    # até um conselheiro da própria embaixada (ou a Diretoria) criar o
    # acesso via endpoint dedicado — ver core/api/membros.py.
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="membro",
    )

    class Meta:
        verbose_name = "Membro"
        verbose_name_plural = "Membros"
        ordering = ["nome"]

    def __str__(self):
        return self.nome

    @property
    def idade(self) -> int:
        hoje = timezone.localdate()
        nascimento = self.data_nascimento
        return hoje.year - nascimento.year - (
            (hoje.month, hoje.day) < (nascimento.month, nascimento.day)
        )

    @property
    def faixa_etaria(self) -> str | None:
        """Só é relevante para membros com tipo 'embaixador_do_rei'."""
        idade = self.idade
        if 9 <= idade <= 11:
            return "junior"
        if 12 <= idade <= 14:
            return "adolescente"
        if 15 <= idade <= 17:
            return "juvenil"
        return None

    @cached_property
    def eh_diretoria(self) -> bool:
        """Tem mandato ativo (sem data_fim) na Diretoria da associação.

        cached_property: o Membro logado é carregado de novo a cada request,
        então o valor fica guardado só durante ele — no máximo 1 consulta
        por request, em vez de 1 por chamada."""
        return self.mandatos_diretoria.filter(data_fim__isnull=True).exists()


class Diretoria(models.Model):
    """
    Diretoria da associação (DAER Nilopolitano) — só Membros com
    tipo=conselheiro podem ocupar um cargo aqui (validado na API, não no
    banco). Mantém data_fim para preservar histórico de mandatos.
    """

    class Cargo(models.TextChoices):
        COORDENADOR = "coordenador", "Coordenador"
        PRESIDENTE = "presidente", "Presidente"
        VICE_PRESIDENTE = "vice_presidente", "Vice-Presidente"
        PRIMEIRO_SECRETARIO = "primeiro_secretario", "1º Secretário"
        SEGUNDO_SECRETARIO = "segundo_secretario", "2º Secretário"
        DIRETOR_MIDIA_COMUNICACAO = (
            "diretor_midia_comunicacao",
            "Diretor de Mídia e Comunicação",
        )
        DIRETOR_ESPORTES = "diretor_esportes", "Diretor de Esportes"

    membro = models.ForeignKey(
        Membro, on_delete=models.CASCADE, related_name="mandatos_diretoria"
    )
    cargo = models.CharField(max_length=40, choices=Cargo.choices)
    data_inicio = models.DateField()
    data_fim = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Diretoria"
        verbose_name_plural = "Diretoria"
        ordering = ["-data_inicio"]
        constraints = [
            # Um membro só pode ter 1 mandato ativo (sem data_fim) por vez —
            # "não pode ter mais de um cargo" na diretoria.
            models.UniqueConstraint(
                fields=["membro"],
                condition=models.Q(data_fim__isnull=True),
                name="unico_mandato_ativo_por_membro",
            ),
        ]

    def __str__(self):
        return f"{self.membro} — {self.get_cargo_display()}"


class GrupoTrabalho(models.Model):
    """
    Catálogo de grupos (Música, Programações, Evangelismo, hoje) —
    tabela em vez de enum fixo, pra permitir criar um grupo novo no
    futuro sem precisar de migração.
    """

    nome = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name = "Grupo de Trabalho"
        verbose_name_plural = "Grupos de Trabalho"
        ordering = ["nome"]

    def __str__(self):
        return self.nome


class GrupoMembro(models.Model):
    class PapelNoGrupo(models.TextChoices):
        LIDER = "lider", "Líder"
        MEMBRO = "membro", "Membro"

    grupo = models.ForeignKey(GrupoTrabalho, on_delete=models.CASCADE, related_name="participantes")
    membro = models.ForeignKey(Membro, on_delete=models.CASCADE, related_name="grupos_trabalho")
    papel_no_grupo = models.CharField(max_length=10, choices=PapelNoGrupo.choices)

    class Meta:
        verbose_name = "Participante de Grupo de Trabalho"
        verbose_name_plural = "Participantes de Grupos de Trabalho"
        ordering = ["grupo", "papel_no_grupo", "membro__nome"]
        constraints = [
            # Uma pessoa só entra 1 vez em cada grupo (como líder OU membro).
            models.UniqueConstraint(fields=["grupo", "membro"], name="unico_membro_por_grupo"),
            # Regra de negócio "lidera no máximo 1 grupo": um Membro só pode
            # ter no máximo uma linha com papel_no_grupo=lider em toda a
            # tabela (não só dentro de um grupo) — daí o campo único ser só
            # `membro`, com a condição restringindo à liderança.
            models.UniqueConstraint(
                fields=["membro"],
                condition=models.Q(papel_no_grupo="lider"),
                name="unico_grupo_liderado_por_membro",
            ),
        ]

    def __str__(self):
        return f"{self.membro} — {self.grupo} ({self.get_papel_no_grupo_display()})"


class DiretoriaEmbaixada(models.Model):
    """
    Quadro de oficiais de uma embaixada — cargos ocupados pelos próprios
    Embaixadores do Rei (tipo=embaixador_do_rei), como prática de
    liderança, não por conselheiros. Cargo é editável pelo conselheiro da
    embaixada; atribuir um cargo já ocupado troca o titular automaticamente
    (sem manter histórico, diferente da Diretoria da associação).
    """

    class Cargo(models.TextChoices):
        EMBAIXADOR_CHEFE = "embaixador_chefe", "Embaixador Chefe"
        EMBAIXADOR_ASSISTENTE = "embaixador_assistente", "Embaixador Assistente"
        SECRETARIO = "secretario", "Secretário"
        INTENDENTE = "intendente", "Intendente"
        PORTA_VOZ = "porta_voz", "Porta-voz"
        CONSUL = "consul", "Cônsul"
        TESOUREIRO = "tesoureiro", "Tesoureiro"
        DIRETOR_MUSICA = "diretor_musica", "Diretor de Música"
        DIRETOR_ESPORTES = "diretor_esportes", "Diretor de Esportes"

    embaixada = models.ForeignKey(
        Embaixada, on_delete=models.CASCADE, related_name="quadro_oficiais"
    )
    membro = models.ForeignKey(
        Membro, on_delete=models.CASCADE, related_name="cargos_embaixada"
    )
    cargo = models.CharField(max_length=30, choices=Cargo.choices)
    data_inicio = models.DateField()

    class Meta:
        verbose_name = "Diretoria da Embaixada"
        verbose_name_plural = "Diretorias das Embaixadas"
        ordering = ["embaixada", "cargo"]
        constraints = [
            # Só um titular por cargo por embaixada de cada vez.
            models.UniqueConstraint(fields=["embaixada", "cargo"], name="unico_titular_por_cargo"),
        ]

    def __str__(self):
        return f"{self.membro} — {self.get_cargo_display()} ({self.embaixada})"


class Carteirinha(models.Model):
    """Exclusiva para Membro com tipo=embaixador_do_rei (validado na API)."""

    membro = models.OneToOneField(
        Membro, on_delete=models.CASCADE, related_name="carteirinha"
    )
    identificador = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    validade = models.DateField()
    emitida_em = models.DateField(auto_now_add=True)

    class Meta:
        verbose_name = "Carteirinha"
        verbose_name_plural = "Carteirinhas"

    def __str__(self):
        return f"Carteirinha de {self.membro}"
