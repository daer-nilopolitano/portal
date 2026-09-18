"""
Entidades principais do sistema de gestão do DAER Nilopolitano.

Ver o plano de desenvolvimento para o desenho completo dessas entidades.
Evento fica, por enquanto, como página do Wagtail (app `cms`) — o modelo
equivalente está comentado no final deste arquivo, pronto para ser
ativado se a diretoria precisar de inscrição/confirmação de presença
por evento no futuro.
"""
import uuid
from datetime import date

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
    conselheiro_responsavel = models.ForeignKey(
        "Membro",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="embaixadas_lideradas",
        help_text="Deve ser um Membro com Papel do tipo 'conselheiro'. É quem cadastra embaixadores e auxiliares desta embaixada.",
    )
    conselheiros = models.ManyToManyField(
        "Membro",
        related_name="embaixadas_como_conselheiro",
        blank=True,
        help_text="Demais conselheiros desta embaixada, além do responsável acima.",
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


class Membro(models.Model):
    nome = models.CharField(max_length=200)
    data_nascimento = models.DateField()
    foto = models.ImageField(upload_to="membros/fotos/", null=True, blank=True)
    telefone_contato = models.CharField(max_length=20, blank=True)
    email = models.EmailField(unique=True, null=True, blank=True)

    # Preenchidos apenas quando o membro tem Papel do tipo "embaixador_do_rei"
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

    # Login do membro no sistema (diretoria, conselheiro ou embaixador do rei
    # — todos podem ter conta, conforme decidido no planejamento). Fica nulo
    # até alguém (Diretoria ou o próprio conselheiro da embaixada) criar o
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
        """Só é relevante para membro que é 'embaixador_do_rei'."""
        idade = self.idade
        if 9 <= idade <= 11:
            return "junior"
        if 12 <= idade <= 14:
            return "adolescente"
        if 15 <= idade <= 17:
            return "juvenil"
        return None

    @property
    def papel_atual(self) -> "Papel | None":
        """
        Papel vigente hoje (data_inicio <= hoje e data_fim nulo ou futuro).
        Um membro pode ter mais de um Papel ao longo do tempo (ex.: foi
        conselheiro e depois entrou pra diretoria) — este é o que vale
        para checagens de permissão na API.
        """
        hoje = timezone.localdate()
        return (
            self.papeis.filter(data_inicio__lte=hoje)
            .filter(models.Q(data_fim__isnull=True) | models.Q(data_fim__gte=hoje))
            .order_by("-data_inicio")
            .first()
        )


class Papel(models.Model):
    class Tipo(models.TextChoices):
        DIRETORIA = "diretoria", "Diretoria"
        CONSELHEIRO = "conselheiro", "Conselheiro"
        EMBAIXADOR_DO_REI = "embaixador_do_rei", "Embaixador do Rei"

    class CargoDiretoria(models.TextChoices):
        COORDENADOR = "coordenador", "Coordenador"
        PRESIDENTE = "presidente", "Presidente"
        PRIMEIRO_SECRETARIO = "primeiro_secretario", "1º Secretário"
        SEGUNDO_SECRETARIO = "segundo_secretario", "2º Secretário"
        DIRETOR_MIDIA_COMUNICACAO = (
            "diretor_midia_comunicacao",
            "Diretor de Mídia e Comunicação",
        )
        DIRETOR_ESPORTES = "diretor_esportes", "Diretor de Esportes"

    membro = models.ForeignKey(Membro, on_delete=models.CASCADE, related_name="papeis")
    tipo = models.CharField(max_length=30, choices=Tipo.choices)
    cargo_diretoria = models.CharField(
        "Cargo na diretoria",
        max_length=40,
        choices=CargoDiretoria.choices,
        null=True,
        blank=True,
        help_text="Preencher apenas quando tipo = Diretoria.",
    )
    data_inicio = models.DateField()
    data_fim = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Papel"
        verbose_name_plural = "Papéis"
        ordering = ["-data_inicio"]

    def __str__(self):
        return f"{self.membro} — {self.get_tipo_display()}"


class Carteirinha(models.Model):
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


# ---------------------------------------------------------------------------
# Evento fica como página do Wagtail por enquanto (ver cms/models.py).
# O modelo abaixo é só uma referência pronta para o dia em que a diretoria
# precisar de inscrição/confirmação de presença por evento — não é usado
# hoje e não tem migração gerada.
# ---------------------------------------------------------------------------
# class Evento(models.Model):
#     class Tipo(models.TextChoices):
#         CONCLAVE = "conclave", "Conclave"
#         INTERCAMBIO = "intercambio", "Intercâmbio"
#         MUTIRAO = "mutirao", "Mutirão"
#         PROGRAMACAO_ESPECIAL = "programacao_especial", "Programação especial"
#         OUTRO = "outro", "Outro"
#
#     titulo = models.CharField(max_length=200)
#     data = models.DateTimeField()
#     local_descricao = models.CharField(max_length=200, blank=True)
#     igreja = models.ForeignKey(
#         Igreja, on_delete=models.SET_NULL, null=True, blank=True
#     )
#     tipo = models.CharField(max_length=30, choices=Tipo.choices)
#     cooperacao_externa = models.BooleanField(default=False)
#
#     def __str__(self):
#         return self.titulo
