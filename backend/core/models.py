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

from django.db import models


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


class Embaixada(models.Model):
    nome = models.CharField(max_length=200)
    igreja = models.OneToOneField(
        Igreja, on_delete=models.PROTECT, related_name="embaixada"
    )
    conselheiro_responsavel = models.ForeignKey(
        "Pessoa",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="embaixadas_lideradas",
        help_text="Deve ser uma Pessoa com Papel do tipo 'conselheiro'.",
    )

    class Meta:
        verbose_name = "Embaixada"
        verbose_name_plural = "Embaixadas"
        ordering = ["nome"]

    def __str__(self):
        return self.nome


class Pessoa(models.Model):
    nome = models.CharField(max_length=200)
    data_nascimento = models.DateField()
    foto = models.ImageField(upload_to="pessoas/fotos/", null=True, blank=True)
    telefone_contato = models.CharField(max_length=20, blank=True)
    email = models.EmailField(unique=True, null=True, blank=True)

    # Preenchidos apenas quando a pessoa tem Papel do tipo "embaixador_do_rei"
    nome_responsavel = models.CharField(
        "Nome do responsável", max_length=200, blank=True
    )
    telefone_responsavel = models.CharField(
        "Telefone do responsável", max_length=20, blank=True
    )

    embaixada = models.ForeignKey(
        Embaixada, on_delete=models.PROTECT, related_name="pessoas"
    )
    ativo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Pessoa"
        verbose_name_plural = "Pessoas"
        ordering = ["nome"]

    def __str__(self):
        return self.nome

    @property
    def idade(self) -> int:
        hoje = date.today()
        nascimento = self.data_nascimento
        return hoje.year - nascimento.year - (
            (hoje.month, hoje.day) < (nascimento.month, nascimento.day)
        )

    @property
    def faixa_etaria(self) -> str | None:
        """Só é relevante para pessoas com papel 'embaixador_do_rei'."""
        idade = self.idade
        if 9 <= idade <= 11:
            return "junior"
        if 12 <= idade <= 14:
            return "adolescente"
        if 15 <= idade <= 17:
            return "juvenil"
        return None


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

    pessoa = models.ForeignKey(Pessoa, on_delete=models.CASCADE, related_name="papeis")
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
        return f"{self.pessoa} — {self.get_tipo_display()}"


class Carteirinha(models.Model):
    pessoa = models.OneToOneField(
        Pessoa, on_delete=models.CASCADE, related_name="carteirinha"
    )
    identificador = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    validade = models.DateField()
    emitida_em = models.DateField(auto_now_add=True)

    class Meta:
        verbose_name = "Carteirinha"
        verbose_name_plural = "Carteirinhas"

    def __str__(self):
        return f"Carteirinha de {self.pessoa}"


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
