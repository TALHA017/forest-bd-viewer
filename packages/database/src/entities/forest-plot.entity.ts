import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

@Entity('forest_plots')
@Index(['codeRegion'])
@Index(['codeDepartement'])
@Index(['codeCommune'])
export class ForestPlot {
    @PrimaryColumn()
    id!: string;

    @Column({ nullable: true })
    codeRegion!: string;

    @Column({ nullable: true })
    codeDepartement!: string;

    @Column({ nullable: true })
    codeCommune!: string;

    @Column({ nullable: true })
    lieuDit?: string;

    @Column('geometry', { spatialFeatureType: 'Polygon', srid: 4326 })
    geom!: any;

    @Column('varchar', { array: true, nullable: true })
    essences?: string[];

    @Column('double precision', { nullable: true })
    surfaceHectares?: number;

    @Column({ nullable: true })
    typeForet?: string;
}