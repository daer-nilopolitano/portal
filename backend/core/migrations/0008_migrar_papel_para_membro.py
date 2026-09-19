# Fase 2, passo 2 de 3 — migração de dados. Papel ainda existe nesse ponto
# (só é removido na 0009); aqui a gente lê o papel_atual de cada Membro e
# preenche os campos novos com base nele.
#
# IMPORTANTE: Membro.tipo vai virar obrigatório na próxima migração (0009).
# Se algum Membro não tiver nenhum Papel vigente hoje, ele fica com tipo
# nulo aqui — rode a checagem no final desta migração (ela avisa no
# console se sobrar algum) e ajuste pelo Django Admin antes de aplicar a
# 0009, ou a migração seguinte vai falhar.

from django.db import migrations


def migrar_dados(apps, schema_editor):
    Membro = apps.get_model("core", "Membro")
    Diretoria = apps.get_model("core", "Diretoria")

    sem_papel = []

    for membro in Membro.objects.all():
        papel = (
            membro.papeis.order_by("-data_inicio").first()
        )
        # Usa o mais recente como aproximação de "papel_atual" — a property
        # original filtrava por data, mas dentro de uma migração de dados
        # não vale a pena reproduzir a mesma lógica de datas; o objetivo
        # aqui é só migrar o estado atual real da organização.
        if papel is None:
            sem_papel.append(membro.nome)
            continue

        if papel.tipo == "diretoria":
            membro.tipo = "conselheiro"
            Diretoria.objects.create(
                membro=membro,
                cargo=papel.cargo_diretoria,
                data_inicio=papel.data_inicio,
                data_fim=papel.data_fim,
            )
        elif papel.tipo == "embaixador_do_rei":
            membro.tipo = "embaixador_do_rei"
            membro.posto_embaixador = "escudeiro"
        else:
            membro.tipo = papel.tipo  # "conselheiro"

        membro.save(update_fields=["tipo", "posto_embaixador"])

    if sem_papel:
        nomes = ", ".join(sem_papel)
        print(
            f"\n[AVISO] {len(sem_papel)} membro(s) sem nenhum Papel cadastrado, "
            f"ficaram com tipo nulo: {nomes}. "
            "Defina o tipo deles pelo Django Admin antes de rodar a próxima "
            "migração (0009), que torna o campo obrigatório.\n"
        )


def reverter(apps, schema_editor):
    # Não há como desfazer com segurança sem recriar os Papeis originais —
    # se precisar reverter, restaure o dump do banco de antes desta migração.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0007_membro_tipo_posto_e_novos_modelos'),
    ]

    operations = [
        migrations.RunPython(migrar_dados, reverter),
    ]
