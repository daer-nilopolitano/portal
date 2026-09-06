"""
Páginas do Wagtail: conteúdo público editável pela diretoria sem precisar
mexer em código (home, notícias, sobre, contato, eventos).
"""
from django.db import models
from wagtail.admin.panels import FieldPanel
from wagtail.fields import RichTextField
from wagtail.models import Page


class HomePage(Page):
    """Página inicial: apresentação do DAER + chamadas para notícias/eventos."""

    introducao = RichTextField(blank=True)

    content_panels = Page.content_panels + [
        FieldPanel("introducao"),
    ]

    subpage_types = [
        "cms.PaginaInstitucionalPage",
        "cms.NoticiaIndexPage",
        "cms.EventoIndexPage",
    ]


class PaginaInstitucionalPage(Page):
    """Página de conteúdo simples — usada para 'Sobre' e 'Contato'.

    O texto pode começar mockado e ser editado depois pela diretoria
    diretamente pelo admin do Wagtail, sem precisar de deploy.
    """

    corpo = RichTextField(blank=True)

    content_panels = Page.content_panels + [
        FieldPanel("corpo"),
    ]


class NoticiaIndexPage(Page):
    """Página de listagem das notícias (/noticias)."""

    subpage_types = ["cms.NoticiaPage"]

    def get_context(self, request):
        context = super().get_context(request)
        context["noticias"] = (
            NoticiaPage.objects.child_of(self).live().order_by("-data_publicacao")
        )
        return context


class NoticiaPage(Page):
    """Um post de notícia individual."""

    data_publicacao = models.DateField("Data de publicação", null=True, blank=True)
    resumo = models.CharField(max_length=300, blank=True)
    corpo = RichTextField(blank=True)
    imagem_capa = models.ForeignKey(
        "wagtailimages.Image",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
    )

    content_panels = Page.content_panels + [
        FieldPanel("data_publicacao"),
        FieldPanel("resumo"),
        FieldPanel("imagem_capa"),
        FieldPanel("corpo"),
    ]

    parent_page_types = ["cms.NoticiaIndexPage"]


class EventoIndexPage(Page):
    """Página de listagem dos eventos (/eventos)."""

    subpage_types = ["cms.EventoPage"]

    def get_context(self, request):
        context = super().get_context(request)
        context["eventos"] = (
            EventoPage.objects.child_of(self).live().order_by("data_evento")
        )
        return context


class EventoPage(Page):
    """Um evento da agenda associacional (conclave, intercâmbio, mutirão, etc.)."""

    class Tipo(models.TextChoices):
        CONCLAVE = "conclave", "Conclave"
        INTERCAMBIO = "intercambio", "Intercâmbio"
        MUTIRAO = "mutirao", "Mutirão"
        PROGRAMACAO_ESPECIAL = "programacao_especial", "Programação especial"
        OUTRO = "outro", "Outro"

    data_evento = models.DateTimeField("Data do evento")
    local_descricao = models.CharField(
        "Local", max_length=200, blank=True, help_text="Ex.: 'PIB de Olinda' ou 'Local a definir'."
    )
    tipo = models.CharField(max_length=30, choices=Tipo.choices, default=Tipo.OUTRO)
    cooperacao_externa = models.BooleanField(
        "Cooperação com outros DAERs", default=False
    )
    descricao = RichTextField(blank=True)

    content_panels = Page.content_panels + [
        FieldPanel("data_evento"),
        FieldPanel("local_descricao"),
        FieldPanel("tipo"),
        FieldPanel("cooperacao_externa"),
        FieldPanel("descricao"),
    ]

    parent_page_types = ["cms.EventoIndexPage"]
