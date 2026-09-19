# Fase 2, passo 3 de 3 — remove o que não existe mais no domínio novo.
# Só roda depois da 0008 ter migrado os dados (senão o AlterField que torna
# Membro.tipo obrigatório falha se sobrar alguma linha com tipo nulo).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_migrar_papel_para_membro'),
    ]

    operations = [
        migrations.AlterField(
            model_name='membro',
            name='tipo',
            field=models.CharField(choices=[
                ('conselheiro', 'Conselheiro'),
                ('auxiliar', 'Auxiliar'),
                ('embaixador_do_rei', 'Embaixador do Rei'),
            ], max_length=30),
        ),
        migrations.RemoveField(
            model_name='embaixada',
            name='conselheiro_responsavel',
        ),
        migrations.RemoveField(
            model_name='embaixada',
            name='conselheiros',
        ),
        migrations.RemoveField(
            model_name='papel',
            name='membro',
        ),
        migrations.DeleteModel(
            name='Papel',
        ),
    ]
