from django.contrib import admin

from .models import (
    Carteirinha,
    Diretoria,
    DiretoriaEmbaixada,
    Embaixada,
    GrupoMembro,
    GrupoTrabalho,
    HorarioReuniao,
    Igreja,
    Membro,
)


class CarteirinhaInline(admin.StackedInline):
    model = Carteirinha
    extra = 0


class HorarioReuniaoInline(admin.TabularInline):
    model = HorarioReuniao
    extra = 0


class DiretoriaEmbaixadaInline(admin.TabularInline):
    model = DiretoriaEmbaixada
    fk_name = "embaixada"
    extra = 0
    autocomplete_fields = ("membro",)


class MandatoDiretoriaInline(admin.TabularInline):
    """Mostrado no MembroAdmin — histórico de mandatos daquele membro na Diretoria."""

    model = Diretoria
    extra = 0


class GrupoMembroInline(admin.TabularInline):
    model = GrupoMembro
    extra = 0
    autocomplete_fields = ("membro",)


@admin.register(Igreja)
class IgrejaAdmin(admin.ModelAdmin):
    list_display = ("nome", "municipio", "bairro", "contato_nome", "contato_telefone")
    search_fields = ("nome", "bairro", "municipio")


@admin.register(Embaixada)
class EmbaixadaAdmin(admin.ModelAdmin):
    list_display = ("nome", "igreja")
    search_fields = ("nome",)
    autocomplete_fields = ("igreja",)
    inlines = [HorarioReuniaoInline, DiretoriaEmbaixadaInline]


@admin.register(Membro)
class MembroAdmin(admin.ModelAdmin):
    list_display = ("nome", "tipo", "posto_embaixador", "embaixada", "idade", "faixa_etaria", "ativo")
    list_filter = ("tipo", "posto_embaixador", "ativo", "embaixada")
    search_fields = ("nome", "email")
    autocomplete_fields = ("embaixada",)
    inlines = [MandatoDiretoriaInline, CarteirinhaInline]


@admin.register(Diretoria)
class DiretoriaAdmin(admin.ModelAdmin):
    list_display = ("membro", "cargo", "data_inicio", "data_fim")
    list_filter = ("cargo",)
    autocomplete_fields = ("membro",)


@admin.register(GrupoTrabalho)
class GrupoTrabalhoAdmin(admin.ModelAdmin):
    list_display = ("nome",)
    inlines = [GrupoMembroInline]


@admin.register(DiretoriaEmbaixada)
class DiretoriaEmbaixadaAdmin(admin.ModelAdmin):
    list_display = ("membro", "cargo", "embaixada", "data_inicio")
    list_filter = ("cargo", "embaixada")
    autocomplete_fields = ("membro", "embaixada")
