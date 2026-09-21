"""
Páginas do Wagtail: conteúdo público editável pela diretoria sem precisar
mexer em código (home, notícias, sobre, contato, eventos).
"""
from django.db import models
from modelcluster.fields import ParentalKey
from rest_framework.fields import Field
from wagtail.admin.panels import FieldPanel, InlinePanel
from wagtail.api import APIField
from wagtail.fields import RichTextField
from wagtail.images.api.fields import ImageRenditionField
from wagtail.models import Orderable, Page
from wagtail.rich_text import expand_db_html


class RichTextHTMLField(Field):
    """Devolve o rich text como HTML pronto (links e imagens internos resolvidos)."""

    def to_representation(self, value):
        return expand_db_html(value)


class HomePage(Page):
    """Página inicial: apresentação do DAER + links rápidos."""

    introducao = RichTextField(blank=True)
    logo = models.ForeignKey(
        "wagtailimages.Image",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        help_text="Opcional. Se vazio, usa a logo padrão (static/img/logo_daer.png).",
    )

    content_panels = Page.content_panels + [
        FieldPanel("logo"),
        FieldPanel("introducao"),
        InlinePanel("links_rapidos", label="Link", heading="Links da página inicial"),
    ]

    subpage_types = [
        "cms.PaginaInstitucionalPage",
        "cms.NoticiaIndexPage",
        "cms.EventoIndexPage",
    ]


class LinkHome(Orderable):
    page = ParentalKey(HomePage, on_delete=models.CASCADE, related_name="links_rapidos")
    titulo = models.CharField(max_length=100)
    descricao = models.CharField("Descrição", max_length=200, blank=True)
    url = models.CharField(
        "URL", max_length=300, help_text="Ex.: /django-admin/, /cms-admin/ ou https://..."
    )

    panels = [
        FieldPanel("titulo"),
        FieldPanel("descricao"),
        FieldPanel("url"),
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
    autor = models.CharField(
        "Autor", max_length=150, blank=True, help_text="Ex.: 'Dc. Júlio'."
    )
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
        FieldPanel("autor"),
        FieldPanel("resumo"),
        FieldPanel("imagem_capa"),
        FieldPanel("corpo"),
        InlinePanel("galeria", label="Foto", heading="Galeria de fotos"),
    ]

    api_fields = [
        APIField("data_publicacao"),
        APIField("autor"),
        APIField("resumo"),
        APIField("corpo", serializer=RichTextHTMLField(read_only=True)),
        APIField("imagem_capa", serializer=ImageRenditionField("fill-1200x675")),
        APIField("galeria"),
    ]

    parent_page_types = ["cms.NoticiaIndexPage"]


class NoticiaGaleriaImagem(Orderable):
    """Uma foto da galeria de uma notícia (ex.: fotos de um evento coberto)."""

    page = ParentalKey(NoticiaPage, on_delete=models.CASCADE, related_name="galeria")
    imagem = models.ForeignKey(
        "wagtailimages.Image", on_delete=models.CASCADE, related_name="+"
    )
    legenda = models.CharField(max_length=200, blank=True)

    panels = [
        FieldPanel("imagem"),
        FieldPanel("legenda"),
    ]

    api_fields = [
        APIField("imagem", serializer=ImageRenditionField("fill-1600x1067")),
        APIField("legenda"),
    ]


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

    api_fields = [
        APIField("data_evento"),
        APIField("local_descricao"),
        APIField("tipo"),
        APIField("cooperacao_externa"),
        APIField("descricao", serializer=RichTextHTMLField(read_only=True)),
    ]

    parent_page_types = ["cms.EventoIndexPage"]
