from django.contrib import admin

from .models import Carteirinha, Embaixada, HorarioReuniao, Igreja, Membro, Papel


class PapelInline(admin.TabularInline):
    model = Papel
    extra = 0


class CarteirinhaInline(admin.StackedInline):
    model = Carteirinha
    extra = 0


class HorarioReuniaoInline(admin.TabularInline):
    model = HorarioReuniao
    extra = 0


@admin.register(Igreja)
class IgrejaAdmin(admin.ModelAdmin):
    list_display = ("nome", "municipio", "bairro", "contato_nome", "contato_telefone")
    search_fields = ("nome", "bairro", "municipio")


@admin.register(Embaixada)
class EmbaixadaAdmin(admin.ModelAdmin):
    list_display = ("nome", "igreja", "conselheiro_responsavel")
    search_fields = ("nome",)
    autocomplete_fields = ("igreja", "conselheiro_responsavel")
    filter_horizontal = ("conselheiros",)
    inlines = [HorarioReuniaoInline]


@admin.register(Membro)
class MembroAdmin(admin.ModelAdmin):
    list_display = ("nome", "embaixada", "idade", "faixa_etaria", "ativo")
    list_filter = ("ativo", "embaixada")
    search_fields = ("nome", "email")
    autocomplete_fields = ("embaixada",)
    inlines = [PapelInline, CarteirinhaInline]


@admin.register(Papel)
class PapelAdmin(admin.ModelAdmin):
    list_display = ("membro", "tipo", "cargo_diretoria", "data_inicio", "data_fim")
    list_filter = ("tipo", "cargo_diretoria")
    autocomplete_fields = ("membro",)
